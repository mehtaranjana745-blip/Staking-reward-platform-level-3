import { useState, useEffect } from 'react';
import { rpc, Networks, Contract, TransactionBuilder, Address, nativeToScVal, scValToNative } from '@stellar/stellar-sdk';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import { Activity, Coins, Clock, ArrowRight, ShieldCheck, AlertCircle, Calculator, Check, Copy, LogOut, Palette, Timer, Droplets, X, Wifi, WifiOff } from 'lucide-react';
import { calculateProjectedYield, formatDuration } from './utils';
import './index.css';

const STAKING_CONTRACT_ID = import.meta.env.VITE_STAKING_CONTRACT_ID || "CC7TQ56NU4YDBITTGPNIO6IPEGBEL2CABV2EC55Z3MLIY7QCXICRGGT2";
const TOKEN_CONTRACT_ID = import.meta.env.VITE_TOKEN_CONTRACT_ID || "CDUPTQYFX2526AT5R3LY33DT3UFMO7ELLJ2VPFJFLQKCRILTZZKWHZ4N";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';

StellarWalletsKit.init({ modules: defaultModules() });

interface StakingEvent {
  id: string;
  type: string;
  user: string;
  amount: string;
  time: string;
}

export default function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [stakedAmount, setStakedAmount] = useState('0');
  const [pendingRewards, setPendingRewards] = useState('0');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [stakeInput, setStakeInput] = useState('');
  const [events, setEvents] = useState<StakingEvent[]>([]);
  const [status, setStatus] = useState<{type: 'pending'|'success'|'error', msg: string, hash?: string} | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [copied, setCopied] = useState(false);
  const [eventFilter, setEventFilter] = useState<'all' | 'staked' | 'unstaked' | 'claimed'>('all');
  const [stakingDuration, setStakingDuration] = useState(0);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [rpcLatency, setRpcLatency] = useState<number | null>(null);
  const [rpcStatus, setRpcStatus] = useState<'online' | 'error'>('online');
  const [theme, setTheme] = useState<'emerald' | 'sapphire' | 'amethyst'>(() => {
    return (localStorage.getItem('stellarstake_theme') as any) || 'emerald';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('stellarstake_theme', theme);
  }, [theme]);

  // Fetch real on-chain data from contracts
  const fetchContractData = async (userAddress: string) => {
    try {
      const server = new rpc.Server(RPC_URL);
      const source = await server.getAccount(userAddress);
      
      // 1. Get Stake
      const stakeTx = new TransactionBuilder(source, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(
        new Contract(STAKING_CONTRACT_ID).call("get_stake", new Address(userAddress).toScVal())
      )
      .setTimeout(30)
      .build();
      
      const stakeSim = await server.simulateTransaction(stakeTx);
      if (rpc.Api.isSimulationSuccess(stakeSim) && stakeSim.result && stakeSim.result.retval) {
        const val = scValToNative(stakeSim.result.retval);
        setStakedAmount((Number(val) / 10000000).toString());
      }
      
      // 2. Get Pending Rewards
      const rewardsTx = new TransactionBuilder(source, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(
        new Contract(STAKING_CONTRACT_ID).call("calculate_rewards", new Address(userAddress).toScVal())
      )
      .setTimeout(30)
      .build();
      
      const rewardsSim = await server.simulateTransaction(rewardsTx);
      if (rpc.Api.isSimulationSuccess(rewardsSim) && rewardsSim.result && rewardsSim.result.retval) {
        const val = scValToNative(rewardsSim.result.retval);
        setPendingRewards((Number(val) / 10000000).toFixed(4));
      }

      // 3. Get Token Balance
      const balanceTx = new TransactionBuilder(source, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(
        new Contract(TOKEN_CONTRACT_ID).call("balance", new Address(userAddress).toScVal())
      )
      .setTimeout(30)
      .build();
      
      const balanceSim = await server.simulateTransaction(balanceTx);
      if (rpc.Api.isSimulationSuccess(balanceSim) && balanceSim.result && balanceSim.result.retval) {
        const val = scValToNative(balanceSim.result.retval);
        setTokenBalance((Number(val) / 10000000).toFixed(4));
      }
    } catch (err) {
      console.error("Error fetching contract data:", err);
    }
  };

  // Poll for events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const server = new rpc.Server(RPC_URL);
        const latestLedger = (await server.getLatestLedger()).sequence;
        const response = await server.getEvents({
          startLedger: latestLedger - 10000,
          filters: [
            {
              type: "contract",
              contractIds: [STAKING_CONTRACT_ID]
            }
          ]
        });
        
        if (response.events) {
          const parsedEvents: StakingEvent[] = response.events.map((e: any): StakingEvent => {
            let typeStr = "Unknown";
            let userStr = "Unknown";
            let amountVal = "0";
            
            try {
              if (Array.isArray(e.topic) && e.topic[0]) {
                typeStr = String(scValToNative(e.topic[0]));
              }
              if (Array.isArray(e.topic) && e.topic[1]) {
                userStr = String(scValToNative(e.topic[1]));
              }
              if (e.value) {
                amountVal = String(scValToNative(e.value));
              }
            } catch (err) {
              console.error("Error parsing event XDR:", err);
            }
            
            return {
              id: String(e.id),
              type: typeStr,
              user: userStr !== "Unknown" ? `${userStr.slice(0, 4)}...${userStr.slice(-4)}` : "Unknown", 
              amount: amountVal,
              time: new Date().toLocaleTimeString()
            };
          });
          setEvents(parsedEvents.reverse().slice(0, 10)); // Top 10 recent
        }
      } catch (err) {
        console.error("Error fetching events:", err);
      }
    };

    if (STAKING_CONTRACT_ID.startsWith('C')) {
      fetchEvents();
      const interval = setInterval(fetchEvents, 10000); // every 10s
      return () => clearInterval(interval);
    }
  }, []);

  // Monitor Soroban RPC Connection & Latency
  useEffect(() => {
    const pingRpc = async () => {
      const start = Date.now();
      try {
        const server = new rpc.Server(RPC_URL);
        await server.getLatestLedger();
        setRpcLatency(Date.now() - start);
        setRpcStatus('online');
      } catch (err) {
        setRpcStatus('error');
        setRpcLatency(null);
      }
    };
    pingRpc();
    const interval = setInterval(pingRpc, 20000);
    return () => clearInterval(interval);
  }, []);



  const connectWallet = async () => {
    try {
      const { address: newAddress } = await StellarWalletsKit.authModal();
      setAddress(newAddress);
      setStatus({type: 'success', msg: 'Wallet connected successfully'});
      fetchContractData(newAddress);
    } catch (e: any) {
      setStatus({type: 'error', msg: e.message || 'Wallet connection failed'});
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setStakedAmount('0');
    setPendingRewards('0');
    setTokenBalance('0');
    setStatus({type: 'success', msg: 'Disconnected successfully'});
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requestFaucet = async () => {
    if (!address) return setStatus({ type: 'error', msg: 'Connect wallet to request testnet XLM' });
    setFaucetLoading(true);
    setStatus({ type: 'pending', msg: 'Requesting 10,000 Testnet XLM from Friendbot...' });
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${address}`);
      if (res.ok) {
        setStatus({ type: 'success', msg: 'Friendbot funded 10,000 XLM successfully!' });
        setTimeout(() => fetchContractData(address), 2000);
      } else {
        throw new Error('Friendbot rate-limited or account already initialized');
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: e.message || 'Friendbot request failed' });
    } finally {
      setFaucetLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchContractData(address);
      const interval = setInterval(() => {
        fetchContractData(address);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [address]);

  useEffect(() => {
    if (Number(stakedAmount) > 0) {
      const timer = setInterval(() => {
        setStakingDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setStakingDuration(0);
    }
  }, [stakedAmount]);

  useEffect(() => {
    if (status && status.type !== 'pending') {
      const timer = setTimeout(() => {
        setStatus(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const stake = async () => {
    if (!address) return setStatus({type: 'error', msg: 'Wallet not connected'});
    if (!stakeInput || isNaN(Number(stakeInput)) || Number(stakeInput) <= 0) {
      return setStatus({type: 'error', msg: 'Invalid stake amount'});
    }
    
    setStatus({type: 'pending', msg: 'Building transaction...'});
    try {
      const server = new rpc.Server(RPC_URL);
      const source = await server.getAccount(address);
      const contract = new Contract(STAKING_CONTRACT_ID);
      
      const stroopsAmount = (Number(stakeInput) * 10000000).toFixed(0);
      
      const tx = new TransactionBuilder(source, {
        fee: "10000",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(
        contract.call("stake", 
          new Address(address).toScVal(), 
          nativeToScVal(stroopsAmount, { type: "i128" })
        )
      )
      .setTimeout(30)
      .build();

      const preparedTransaction = await server.prepareTransaction(tx);
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(preparedTransaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
        address
      });
      
      const txToSubmit = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE) as any;
      
      setStatus({type: 'pending', msg: 'Submitting transaction...'});
      const response = await server.sendTransaction(txToSubmit);
      
      if (response.status === 'PENDING') {
        setStatus({type: 'success', msg: 'Staked successfully', hash: response.hash});
        setStakeInput('');
        setTimeout(() => fetchContractData(address), 4000);
      } else {
        throw new Error('Transaction failed on network');
      }
    } catch (e: any) {
      setStatus({type: 'error', msg: 'Transaction failed: ' + e.message});
    }
  };

  const unstake = async () => {
    if (!address) return setStatus({type: 'error', msg: 'Wallet not connected'});
    
    setStatus({type: 'pending', msg: 'Unstaking...'});
    try {
      const server = new rpc.Server(RPC_URL);
      const source = await server.getAccount(address);
      const contract = new Contract(STAKING_CONTRACT_ID);
      
      const tx = new TransactionBuilder(source, {
        fee: "10000",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(
        contract.call("unstake", new Address(address).toScVal())
      )
      .setTimeout(30)
      .build();

      const preparedTransaction = await server.prepareTransaction(tx);
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(preparedTransaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
        address
      });
      const txToSubmit = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE) as any;
      
      const response = await server.sendTransaction(txToSubmit);
      if (response.status === 'PENDING') {
        setStatus({type: 'success', msg: 'Unstaked successfully', hash: response.hash});
        setStakedAmount('0');
        setPendingRewards('0');
        setTimeout(() => fetchContractData(address), 4000);
      } else {
        throw new Error('Transaction failed on network');
      }
    } catch (e: any) {
      setStatus({type: 'error', msg: 'Transaction failed: ' + e.message});
    }
  };

  const claim = async () => {
    if (!address) return setStatus({type: 'error', msg: 'Wallet not connected'});
    
    setStatus({type: 'pending', msg: 'Claiming rewards...'});
    try {
      const server = new rpc.Server(RPC_URL);
      const source = await server.getAccount(address);
      const contract = new Contract(STAKING_CONTRACT_ID);
      
      const tx = new TransactionBuilder(source, {
        fee: "10000",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(
        contract.call("claim_rewards", new Address(address).toScVal())
      )
      .setTimeout(30)
      .build();

      const preparedTransaction = await server.prepareTransaction(tx);
      const { signedTxXdr } = await StellarWalletsKit.signTransaction(preparedTransaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
        address
      });
      const txToSubmit = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE) as any;
      
      const response = await server.sendTransaction(txToSubmit);
      if (response.status === 'PENDING') {
        setStatus({type: 'success', msg: 'Rewards claimed successfully', hash: response.hash});
        setPendingRewards('0');
        setTimeout(() => fetchContractData(address), 4000);
      } else {
        throw new Error('Transaction failed on network');
      }
    } catch (e: any) {
      setStatus({type: 'error', msg: 'Transaction failed: ' + e.message});
    }
  };

  return (
    <div className="container">
      <header className="header">
        <div className="logo-container">
          <Activity size={32} color="var(--primary)" />
          <span className="logo-text">StellarStake</span>
          <div className="theme-selector" title="Switch Theme Glow">
            <Palette size={14} color="var(--text-muted)" style={{ marginRight: '2px' }} />
            <span
              className={`theme-dot emerald ${theme === 'emerald' ? 'active' : ''}`}
              onClick={() => setTheme('emerald')}
              title="Emerald Glow"
            />
            <span
              className={`theme-dot sapphire ${theme === 'sapphire' ? 'active' : ''}`}
              onClick={() => setTheme('sapphire')}
              title="Sapphire Glow"
            />
            <span
              className={`theme-dot amethyst ${theme === 'amethyst' ? 'active' : ''}`}
              onClick={() => setTheme('amethyst')}
              title="Amethyst Glow"
            />
          </div>
          <div className={`network-status-pill ${rpcStatus}`} title={`Soroban RPC URL: ${RPC_URL}`}>
            {rpcStatus === 'online' ? <Wifi size={12} color="var(--primary)" /> : <WifiOff size={12} color="var(--error)" />}
            <span>Testnet {rpcLatency ? `(${rpcLatency}ms)` : ''}</span>
          </div>
        </div>
        
        {address ? (
          <div className="wallet-header-group">
            <button
              type="button"
              className="btn btn-faucet"
              onClick={requestFaucet}
              disabled={faucetLoading}
              title="Request 10,000 Free Testnet XLM from Friendbot"
            >
              <Droplets size={16} color="var(--accent)" />
              <span>{faucetLoading ? 'Funding...' : 'Faucet'}</span>
            </button>
            <button 
              type="button"
              className="btn address-badge-btn" 
              onClick={copyAddress}
              title="Click to copy full address"
            >
              {copied ? <Check size={16} color="var(--primary)" /> : <Copy size={16} color="var(--text-muted)" />}
              <span>{address.slice(0, 4)}...{address.slice(-4)}</span>
              {copied && <span className="copied-tooltip">Copied!</span>}
            </button>
            <button 
              type="button"
              className="btn btn-icon-only" 
              onClick={disconnectWallet}
              title="Disconnect Wallet"
            >
              <LogOut size={16} color="#f87171" />
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </header>

      <main className="grid">
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="panel-header" style={{ marginBottom: 0 }}>
              <Coins size={24} color="var(--accent)" />
              Staking Dashboard
            </h2>
            {Number(stakedAmount) > 0 && (
              <div className="active-staking-badge" title="Active Staking Session Duration">
                <span className="pulse-dot" />
                <Timer size={14} color="var(--primary)" />
                <span>Active: {formatDuration(stakingDuration)}</span>
              </div>
            )}
          </div>
          
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card">
              <div className="stat-label">Total Staked</div>
              <div className="stat-value">{stakedAmount} XLM</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Rewards</div>
              <div className="stat-value" style={{ color: 'var(--primary)' }}>
                {pendingRewards} RWT
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">RWT Balance</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>
                {tokenBalance} RWT
              </div>
            </div>
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Amount to Stake</label>
              <div className="preset-container">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className="preset-btn"
                    onClick={() => setStakeInput(pct === 100 ? '100' : pct.toString())}
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
            <div className="input-wrapper">
              <input 
                type="number" 
                placeholder="0.00" 
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
              />
              <span className="input-suffix">XLM</span>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={stake} style={{ justifyContent: 'center' }}>
              Stake XLM
            </button>
            <button className="btn btn-accent" onClick={claim} style={{ justifyContent: 'center' }}>
              Claim Rewards
            </button>
          </div>

          <button 
            className="btn" 
            style={{ width: '100%', marginTop: '1rem', justifyContent: 'center', borderColor: '#f87171', color: '#f87171' }}
            onClick={unstake}
          >
            Unstake & Claim
          </button>

          <button 
            type="button"
            className="btn" 
            style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center', borderColor: 'var(--panel-border)', fontSize: '0.85rem' }}
            onClick={() => setShowCalculator(!showCalculator)}
          >
            <Calculator size={16} color="var(--accent)" />
            {showCalculator ? 'Hide APY Calculator' : 'View Estimated Yield & APY'}
          </button>

          {showCalculator && (
            <div className="yield-calc-card">
              <div className="yield-calc-header">
                <span>Estimated Rewards Projection</span>
                <span className="calc-basis">Basis: {Number(stakeInput) > 0 ? stakeInput : (Number(stakedAmount) > 0 ? stakedAmount : '10')} XLM</span>
              </div>
              <div className="yield-grid">
                {[
                  { label: '1 Day', days: 1 },
                  { label: '7 Days', days: 7 },
                  { label: '30 Days', days: 30 },
                  { label: '1 Year', days: 365 },
                ].map((item) => {
                  const base = Number(stakeInput) > 0 ? Number(stakeInput) : (Number(stakedAmount) > 0 ? Number(stakedAmount) : 10);
                  const projected = calculateProjectedYield(base, item.days);
                  return (
                    <div key={item.days} className="yield-item">
                      <span className="yield-days">{item.label}</span>
                      <span className="yield-val">+{projected.toLocaleString()} RWT</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 className="panel-header" style={{ marginBottom: 0 }}>
              <Clock size={24} color="var(--primary)" />
              Live Activity
            </h2>
            <div className="event-filter-bar">
              {(['all', 'staked', 'unstaked', 'claimed'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`event-filter-btn ${eventFilter === filter ? 'active' : ''}`}
                  onClick={() => setEventFilter(filter)}
                >
                  {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="event-list">
            {events.filter((ev) => eventFilter === 'all' || ev.type.toLowerCase() === eventFilter).length > 0 ? (
              events
                .filter((ev) => eventFilter === 'all' || ev.type.toLowerCase() === eventFilter)
                .map((ev, i) => (
                  <div key={i} className={`event-item ${ev.type.toLowerCase()}`}>
                    <div className="event-icon">
                      {ev.type === 'Staked' ? <ArrowRight size={16} color="var(--primary)" /> : <Activity size={16} />}
                    </div>
                    <div className="event-content">
                      <p><strong>{ev.user}</strong> {ev.type.toLowerCase()} {ev.amount} tokens</p>
                      <div className="event-time">{ev.time}</div>
                    </div>
                  </div>
                ))
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                {events.length === 0 ? 'Waiting for network events...' : `No ${eventFilter} events recorded yet.`}
              </p>
            )}
          </div>
        </div>
      </main>

      {status && (
        <div className={`status-toast ${status.type}`}>
          {status.type === 'error' && <AlertCircle size={20} color="#f87171" />}
          {status.type === 'success' && <ShieldCheck size={20} color="var(--primary)" />}
          {status.type === 'pending' && <Clock size={20} color="#fbbf24" />}
          <div style={{ flex: 1 }}>
            <div>{status.msg}</div>
            {status.hash && (
              <a 
                href={`https://stellar.expert/explorer/testnet/tx/${status.hash}`} 
                target="_blank" 
                rel="noreferrer"
                className="tx-link"
              >
                View on Explorer
              </a>
            )}
          </div>
          <button 
            type="button" 
            className="toast-close-btn" 
            onClick={() => setStatus(null)}
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
          {status.type !== 'pending' && <div className="toast-progress-bar" />}
        </div>
      )}
    </div>
  );
}
