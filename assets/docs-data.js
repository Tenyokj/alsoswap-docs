window.ALSOSWAP_DOCS = [
  {
    slug: "overview",
    group: "Start",
    title: "Overview",
    summary: "What AlsoSwap is, which modules matter, and how the protocol is organized.",
    content: `
      <h1>AlsoSwap Protocol Documentation</h1>
      <p class="lead">AlsoSwap is an upgradeable AMM DEX stack for ERC20 and WETH pairs on Ethereum Sepolia. The protocol covers pool creation, liquidity provisioning, routed swaps, TWAP pricing, treasury fee collection, flash-swap policy, and timelocked governance over core parameters.</p>

      <div>
        <span class="badge">AMM DEX</span>
        <span class="badge">Upgradeable core</span>
        <span class="badge">Immutable pools</span>
        <span class="badge">TWAP oracle</span>
        <span class="badge">Flash swap support</span>
        <span class="badge">Sepolia-first</span>
      </div>

      <h2>What the protocol includes</h2>
      <div class="doc-grid cols-3">
        <div class="card">
          <div class="eyebrow">Execution</div>
          <h3>Router + RouterV2</h3>
          <p>User-facing write surface for liquidity and swaps. RouterV2 adds best-path selection across direct and 2-hop candidate routes.</p>
        </div>
        <div class="card">
          <div class="eyebrow">Market state</div>
          <h3>PoolFactory + LiquidityPool</h3>
          <p>Factory owns pair registry and global fee config. Each pair gets its own immutable constant-product pool with LP shares.</p>
        </div>
        <div class="card">
          <div class="eyebrow">Policy</div>
          <h3>Oracle, Treasury, Governance</h3>
          <p>PriceOracle snapshots TWAP, FeeCollector receives protocol fees, and DEXGovernance timelocks sensitive factory changes.</p>
        </div>
      </div>

      <h2>Protocol goals</h2>
      <ul>
        <li>Give DAO and community tokens a simple path into executable on-chain liquidity.</li>
        <li>Keep user flows familiar: create pool, add liquidity, swap, remove liquidity.</li>
        <li>Preserve operational flexibility by making core control contracts upgradeable behind transparent proxies.</li>
        <li>Avoid hidden authority inside pools: pair contracts are immutable and read config from the factory.</li>
        <li>Expose safer integration primitives through deadline guards, slippage checks, and TWAP consultation.</li>
      </ul>

      <h2>How to read these docs</h2>
      <ol>
        <li>Start with <a href="#architecture">Architecture</a> and <a href="#amm-model">AMM Model</a> to understand system shape.</li>
        <li>Use <a href="#sepolia-addresses">Sepolia Deployment</a> for contract addresses and upgrade references.</li>
        <li>Use individual contract pages for responsibility and integration details.</li>
        <li>Use operations and security sections before touching admin keys, ProxyAdmins, or fee parameters.</li>
      </ol>

      <div class="callout info">
        <strong>Scope note:</strong> this site is assembled directly from <code>alsoswap_core</code> markdown and Solidity sources in the current workspace, then normalized into a single protocol reference.
      </div>
    `,
  },
  {
    slug: "quickstart",
    group: "Start",
    title: "Quickstart",
    summary: "Local setup, compile, test, deploy, and first smoke checks.",
    content: `
      <h1>Quickstart</h1>
      <p class="lead">The core repository already defines the basic developer flow. AlsoSwap targets a modern local toolchain with Node 22+, Hardhat 3, Solidity 0.8.20, and Sepolia-focused deployment scripts.</p>

      <h2>Requirements</h2>
      <ul>
        <li><code>node &gt;= 22.10</code></li>
        <li><code>npm</code></li>
        <li>RPC endpoint and deployer key only when working against Sepolia.</li>
      </ul>

      <h2>Local bootstrap</h2>
      <pre><code>npm i
npm run compile
npm test</code></pre>

      <h2>Run a local environment</h2>
      <pre><code>npx hardhat node
npm run deploy:dex:local
npm run verify:dex:local</code></pre>

      <h2>What gets deployed in a normal stack</h2>
      <ul>
        <li><strong>Core:</strong> PoolFactory, Router, RouterV2, LiquidityPool instances as needed.</li>
        <li><strong>Protocol modules:</strong> PriceOracle, FeeCollector, FlashLoanLimiter, DEXGovernance.</li>
        <li><strong>Infrastructure:</strong> Transparent proxies, dedicated ProxyAdmins, and mock WETH when no external WETH address is supplied.</li>
      </ul>

      <h2>First smoke test</h2>
      <ol>
        <li>Deploy local stack and capture proxy addresses.</li>
        <li>Create one ERC20/WETH pool through the Router by adding initial liquidity.</li>
        <li>Call <code>getAmountsOut</code> on Router and compare it to a live swap.</li>
        <li>Update PriceOracle twice with elapsed time between calls and confirm <code>consult</code> returns a non-zero quote.</li>
        <li>Pause a non-production local module and verify write paths fail as expected.</li>
      </ol>

      <div class="callout warning">
        Local addresses are ephemeral. Every fresh <code>hardhat node</code> restart resets the chain state, so address tables and verification state must be regenerated.
      </div>
    `,
  },
  {
    slug: "architecture",
    group: "Protocol",
    title: "Architecture",
    summary: "System flow, module boundaries, and which contracts own which state.",
    content: `
      <h1>Architecture</h1>
      <p class="lead">AlsoSwap is intentionally split into narrow modules. Pools own reserves and invariant logic, the factory owns global policy, routers own user ergonomics, and governance only queues a small set of factory-level changes.</p>

      <h2>System flow</h2>
      <ol>
        <li>User interacts with <code>Router</code> or <code>RouterV2</code>.</li>
        <li>Router resolves pair addresses through <code>PoolFactory.getPool</code>.</li>
        <li><code>LiquidityPool</code> handles add/remove liquidity and swap execution.</li>
        <li>Pools update reserves and cumulative prices after each state-changing path.</li>
        <li>Protocol fee share is forwarded to <code>FeeCollector</code>.</li>
        <li><code>PriceOracle</code> reads pool cumulative prices to calculate TWAP.</li>
        <li><code>DEXGovernance</code> timelocks sensitive updates into the factory admin surface.</li>
      </ol>

      <h2>Data authority model</h2>
      <table>
        <thead>
          <tr><th>Domain</th><th>Authoritative source</th><th>Why it lives there</th></tr>
        </thead>
        <tbody>
          <tr><td>Pair registry</td><td><code>PoolFactory</code></td><td>Single canonical mapping prevents duplicate pools for the same pair.</td></tr>
          <tr><td>Reserves and LP balances</td><td><code>LiquidityPool</code></td><td>Pool contract is the market state and LP ERC20 token.</td></tr>
          <tr><td>Swap fees and fee receiver</td><td><code>PoolFactory</code></td><td>One place to propagate global fee policy to all pools.</td></tr>
          <tr><td>TWAP snapshots</td><td><code>PriceOracle</code></td><td>Oracle stores observation checkpoints separate from pool execution.</td></tr>
          <tr><td>Queued admin actions</td><td><code>DEXGovernance</code></td><td>Timelock lives outside the factory so delay logic is isolated and auditable.</td></tr>
        </tbody>
      </table>

      <h2>Upgradeability model</h2>
      <ul>
        <li><strong>Upgradeable:</strong> PoolFactory, Router, RouterV2, PriceOracle, FeeCollector, FlashLoanLimiter, DEXGovernance, LiquidityMining.</li>
        <li><strong>Immutable:</strong> LiquidityPool pair instances and utility/shared code like DEXErrors.</li>
        <li><strong>Admin separation:</strong> each upgradeable proxy is paired with a dedicated ProxyAdmin address.</li>
        <li><strong>Storage hygiene:</strong> upgradeable contracts reserve storage gaps for future versions.</li>
      </ul>

      <h2>Trust boundaries</h2>
      <ul>
        <li><strong>Owner role:</strong> protects setter, pause, withdraw, and upgrade-triggering paths.</li>
        <li><strong>Factory pause:</strong> treated as protocol-level stop signal for routers and pools.</li>
        <li><strong>ProxyAdmin ownership:</strong> compromise of a ProxyAdmin owner can replace implementation code for that proxy.</li>
        <li><strong>Pool immutability:</strong> pair logic cannot be upgraded after deployment, which reduces mutable execution surface inside the AMM core.</li>
      </ul>

      <h2>Reference diagram</h2>
      <pre><code>User
  |
  v
Router --------------------------&gt; RouterV2
  |                                   |
  v                                   v
PoolFactory ---------------------- Pool discovery + path scoring
  |
  +-- global config: fee bps, receiver, pause, flash limiter
  |
  +-- createPool(tokenA, tokenB)
  |
  v
LiquidityPool(s)
  | \
  |  +-- protocol fee transfers --&gt; FeeCollector
  |  +-- cumulative prices -------&gt; PriceOracle
  |
  +-- flash-swap limit hook ------&gt; FlashLoanLimiter

DEXGovernance --timelocked actions--&gt; PoolFactory admin surface</code></pre>
    `,
  },
  {
    slug: "amm-model",
    group: "Protocol",
    title: "AMM Model",
    summary: "Pool lifecycle, reserve accounting, LP shares, fees, and invariant behavior.",
    content: `
      <h1>AMM Model</h1>
      <p class="lead">Each AlsoSwap market is a dedicated constant-product pool for one sorted token pair. The pool is both the reserve holder and the LP token contract, so liquidity accounting and execution state stay in the same place.</p>

      <h2>Pool lifecycle</h2>
      <ul class="flow-list">
        <li>Factory creates exactly one pool per token pair, storing both token orders in <code>getPool</code>.</li>
        <li>Initial LP deposits both assets and receives pool shares, with <code>MINIMUM_LIQUIDITY = 1000</code> locked permanently to the burn address.</li>
        <li>Traders send exact input into the pool, then receive computed output based on current reserves and fee config.</li>
        <li>Pools update reserve snapshots and cumulative prices after mutative operations.</li>
        <li>LPs burn shares to redeem proportional underlying reserves.</li>
      </ul>

      <h2>Key mechanics</h2>
      <div class="doc-grid">
        <div class="card">
          <div class="eyebrow">Share issuance</div>
          <h3>LP token minting</h3>
          <p>Pool shares are ERC20 balances. Initial minting subtracts <code>MINIMUM_LIQUIDITY</code>, later minting uses proportional reserve growth.</p>
        </div>
        <div class="card">
          <div class="eyebrow">Input accounting</div>
          <h3>Balance delta based</h3>
          <p>Swap and liquidity helpers rely on actual token balance deltas rather than trusting declared input. This is friendlier to fee-on-transfer behavior.</p>
        </div>
        <div class="card">
          <div class="eyebrow">Fee split</div>
          <h3>LP fee + protocol fee</h3>
          <p>The factory defines total swap fee and protocol fee share. Pools route the protocol share to the fee receiver and keep the remainder in the invariant.</p>
        </div>
        <div class="card">
          <div class="eyebrow">Maintenance</div>
          <h3><code>sync()</code> and <code>skim()</code></h3>
          <p><code>sync</code> aligns reserves with balances. <code>skim</code> removes accidental excess balances beyond tracked reserves.</p>
        </div>
      </div>

      <h2>Invariant and safety checks</h2>
      <ul>
        <li><strong>Deadline enforcement:</strong> all user-sensitive paths reject stale transactions.</li>
        <li><strong>Slippage floors:</strong> liquidity exits and swaps must meet minimum output thresholds.</li>
        <li><strong>Protocol pause:</strong> pool write paths read pause state from the factory.</li>
        <li><strong>Flash invariant:</strong> flash swaps validate repayment plus fee-adjusted invariant preservation.</li>
      </ul>

      <h2>What is not stored in the pool</h2>
      <ul>
        <li>No per-pool owner or custom upgrade hook.</li>
        <li>No route search or path graph.</li>
        <li>No separate oracle snapshot storage beyond cumulative counters.</li>
      </ul>

      <div class="callout success">
        <strong>Design choice:</strong> immutable pools reduce the blast radius of upgrades. Operational flexibility is concentrated in the factory, routers, oracle, treasury, and governance modules instead.
      </div>
    `,
  },
  {
    slug: "swap-routing",
    group: "Protocol",
    title: "Swaps & Routing",
    summary: "Router execution model, ETH handling, hop minimums, and RouterV2 optimization.",
    content: `
      <h1>Swaps & Routing</h1>
      <p class="lead">AlsoSwap exposes two swap layers. <code>Router</code> is the canonical execution interface for direct and multi-hop paths. <code>RouterV2</code> is a path selector that scores direct and 2-hop options, then delegates the actual trade to Router.</p>

      <h2>Router vs RouterV2</h2>
      <table>
        <thead>
          <tr><th>Module</th><th>What it does</th><th>Important limits</th></tr>
        </thead>
        <tbody>
          <tr><td><code>Router</code></td><td>Add/remove liquidity, ETH helpers, direct swaps, and arbitrary multi-hop swaps where <code>path.length &gt;= 2</code>.</td><td>User or integration must provide the path and slippage model.</td></tr>
          <tr><td><code>RouterV2</code></td><td>Scores a direct path and candidate-based 2-hop paths, then executes the winner through the base Router.</td><td>Search quality is bounded by the candidate list and only covers direct plus 2-hop routes.</td></tr>
        </tbody>
      </table>

      <h2>Core swap guardrails</h2>
      <ul>
        <li><strong>Path validation:</strong> token path must be at least two addresses long.</li>
        <li><strong>Deadline:</strong> each execution call rejects expired transactions.</li>
        <li><strong>Output floor:</strong> caller supplies <code>amountOutMin</code> for aggregate protection.</li>
        <li><strong>Per-hop protection:</strong> Router also supports <code>swapExactTokensForTokensWithHopMin</code> for hop-by-hop minimums.</li>
        <li><strong>Pause checks:</strong> router local pause and factory pause both gate execution.</li>
      </ul>

      <h2>ETH handling rules</h2>
      <ul>
        <li>Native ETH is supported only through the WETH address configured in the factory/router stack.</li>
        <li><code>swapExactETHForTokens</code> requires the first path element to be <code>WETH</code>.</li>
        <li><code>swapExactTokensForETH</code> requires the last path element to be <code>WETH</code>.</li>
        <li>Router unwraps WETH at the end of token-to-ETH flow and refunds extra ETH on add-liquidity ETH flow.</li>
      </ul>

      <h2>Execution sequence</h2>
      <ol>
        <li>Router pulls input tokens from the caller.</li>
        <li>For each hop it discovers the required pool from the factory and transfers the hop input directly into that pool.</li>
        <li>The pool calculates real input from the post-transfer balance delta and applies fee math against current reserves.</li>
        <li>Final output is transferred to the target recipient.</li>
        <li>Router emits a high-level swap event covering sender, recipient, input token, output token, and final output amount.</li>
      </ol>

      <div class="callout warning">
        <strong>Integration rule:</strong> RouterV2 is not a global pathfinder. If you want high-quality 2-hop routing, you must feed it a curated set of candidate intermediary tokens with real liquidity.
      </div>
    `,
  },
  {
    slug: "swap-internals",
    group: "Protocol",
    title: "Swap Internals",
    summary: "Balance-delta swap execution, fee accounting, k-invariant, MINIMUM_LIQUIDITY, sync, and skim.",
    content: `
      <h1>Swap Internals</h1>
      <p class="lead">This is the low-level execution model behind AlsoSwap swaps. It matters for frontend engineers, auditors, and anyone building analytics or custom integrations against the pool layer.</p>

      <h2>Exact swap path inside the protocol</h2>
      <ol>
        <li><code>Router._executePathSwap</code> resolves the pool for one hop.</li>
        <li>Router transfers the current hop input token directly into the pool.</li>
        <li>Router records its own output-token balance before the pool call.</li>
        <li>Router calls <code>LiquidityPool.swap(tokenIn, hopMinOut, deadline)</code>.</li>
        <li>Inside the pool, <code>_swapFromCurrentBalance</code> reads the actual token balance and computes <code>amountIn = balanceIn - reserveIn</code>.</li>
        <li>The pool reads live fee config from the factory, takes protocol fee, computes output, sends output tokens to the router, and syncs reserves.</li>
        <li>Router computes the hop output as its new output balance delta, then either starts the next hop or pays the final recipient.</li>
      </ol>

      <h2>Why the pool uses balance delta instead of passing <code>amountIn</code></h2>
      <ul>
        <li><strong>Trust actual balances, not caller claims:</strong> the pool uses what it truly received, not what the caller says it sent.</li>
        <li><strong>Fee-on-transfer friendliness:</strong> if a token arrives net of transfer fees, the pool prices from the real received amount.</li>
        <li><strong>One pool API for multiple callers:</strong> the same pool method works whether the input was pre-transferred by Router or by another integration.</li>
        <li><strong>Lower mismatch risk:</strong> there is no separate caller-supplied <code>amountIn</code> parameter that can drift from actual pool balance.</li>
      </ul>

      <h2>Fee accounting and output formula</h2>
      <pre><code>amountIn = balanceIn - reserveIn
protocolFee = amountIn * protocolFeeBps / BPS
amountInAfterProtocol = amountIn - protocolFee
lpFeeBps = swapFeeBps - protocolFeeBps

amountInWithFee = amountInAfterProtocol * (BPS - lpFeeBps)
amountOut = (amountInWithFee * reserveOut) / (reserveIn * BPS + amountInWithFee)</code></pre>

      <p>The pool transfers the protocol fee to <code>feeReceiver</code> first, emits <code>ProtocolFeePaid</code>, and only then applies the LP-fee-adjusted constant-product output formula to the remaining input.</p>

      <h2>AMM invariant and flash-adjusted checks</h2>
      <ul>
        <li>Normal swaps price against the standard constant-product reserve relationship with fee-adjusted input.</li>
        <li>Flash swaps use a stricter post-callback check with adjusted balances, then revert with <code>InvalidK</code> if repayment is not sufficient.</li>
        <li>Deadline, pause state, zero-liquidity, and minimum-output checks all run before the state update completes.</li>
      </ul>

      <h2>Why <code>MINIMUM_LIQUIDITY</code> is burned on first mint</h2>
      <ul>
        <li>The first LP mint computes <code>sqrt(receivedA * receivedB)</code>.</li>
        <li><code>MINIMUM_LIQUIDITY = 1000</code> is minted to the burn address and removed from usable supply forever.</li>
        <li>This prevents the initial LP from creating a near-zero total supply that can be abused to distort future share pricing.</li>
        <li>It is a standard anti-inflation / anti-manipulation guard for the very first liquidity bootstrap.</li>
      </ul>

      <h2><code>sync()</code> vs <code>skim()</code></h2>
      <table>
        <thead>
          <tr><th>Method</th><th>What it does</th><th>When it is useful</th></tr>
        </thead>
        <tbody>
          <tr><td><code>sync()</code></td><td>Reads actual token balances and writes them into <code>reserveA</code> and <code>reserveB</code>.</td><td>Use after direct transfers or token behavior that changed balances and you want reserves to catch up.</td></tr>
          <tr><td><code>skim(to)</code></td><td>Sends only the excess balances above reserves to a recipient without changing reserve accounting.</td><td>Use to recover accidental dust or stray transfers while keeping the existing reserve snapshot intact.</td></tr>
        </tbody>
      </table>

      <div class="callout info">
        <strong>Operational nuance:</strong> <code>sync</code> changes the reserve baseline and therefore future pricing. <code>skim</code> does not change the reserve baseline; it removes only the excess above it.
      </div>
    `,
  },
  {
    slug: "flash-swaps",
    group: "Protocol",
    title: "Flash Swaps",
    summary: "Callback flow, invariant checks, limiter policy, and practical use-cases.",
    content: `
      <h1>Flash Swaps</h1>
      <p class="lead">AlsoSwap pools support atomic flash swaps through <code>LiquidityPool.flashSwap</code>. The pool sends tokens out first, optionally triggers a callback, and then checks that the pool was repaid enough to preserve the fee-adjusted invariant before the transaction ends.</p>

      <h2>Execution flow</h2>
      <ol>
        <li>Caller requests <code>amountAOut</code>, <code>amountBOut</code>, or both, plus a callback target and arbitrary data payload.</li>
        <li>The pool checks pause state, deadline, non-zero output, and reserve sufficiency.</li>
        <li>If the factory has a limiter configured, the pool calls <code>FlashLoanLimiter.validateFlashSwap</code>.</li>
        <li>The pool transfers the borrowed assets to <code>to</code>.</li>
        <li>If <code>data.length &gt; 0</code>, the pool calls <code>IFlashSwapCallee.flashSwapCall</code>.</li>
        <li>After callback completion, the pool compares current balances to expected post-borrow balances and infers how much was returned.</li>
        <li>Protocol fee is taken from returned input, the flash-adjusted invariant is checked, and reserves are synced.</li>
      </ol>

      <h2>Limiter model</h2>
      <ul>
        <li><code>defaultMaxOutBps</code> sets the baseline flash output cap as a share of reserves.</li>
        <li><code>poolMaxOutBps[pool]</code> can override the default for one market.</li>
        <li>If the limiter is paused, validation reverts because <code>validateFlashSwap</code> is guarded by <code>whenNotPaused</code>.</li>
      </ul>

      <h2>Real use-cases</h2>
      <ul>
        <li>Atomic arbitrage between AlsoSwap and another venue.</li>
        <li>Collateral rotation or refinancing in one transaction.</li>
        <li>Liquidation helpers that need temporary inventory.</li>
        <li>One-transaction inventory management for advanced market-making strategies.</li>
      </ul>

      <h2>Risks and practical limits</h2>
      <ul>
        <li>Repayment must happen in the same transaction or the whole call reverts.</li>
        <li>The primitive is only as safe as the callback contract logic using it.</li>
        <li>Borrow size is limited by reserves and optionally by the flash limiter.</li>
        <li>Factory pause blocks flash swaps through the same pool pause logic as normal swaps.</li>
        <li>The pool primitive is per-market; more complex cross-market strategies must be orchestrated by the callback contract.</li>
      </ul>

      <div class="callout warning">
        <strong>Important:</strong> flash swaps are not a “free loan” surface. They are an atomic inventory primitive. If the callback path is not profitable or repayment-safe, the whole transaction should revert.
      </div>
    `,
  },
  {
    slug: "contract-matrix",
    group: "Protocol",
    title: "Contract Matrix",
    summary: "Responsibility, upgradeability, and control surface by module.",
    content: `
      <h1>Contract Matrix</h1>
      <p class="lead">This page is the fastest way to map the full system. Use it before reviewing single-contract pages or planning integrations.</p>

      <table>
        <thead>
          <tr><th>Contract</th><th>Primary role</th><th>Upgradeable</th><th>Main control surface</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr><td><code>PoolFactory</code></td><td>Pair registry, global fees, fee receiver, flash limiter, protocol pause root</td><td>Yes</td><td>Owner + timelocked governance actions</td><td>Creates immutable pair contracts.</td></tr>
          <tr><td><code>LiquidityPool</code></td><td>Reserves, swaps, LP token, cumulative prices, flash swap logic</td><td>No</td><td>No owner-only trading surface</td><td>One instance per token pair.</td></tr>
          <tr><td><code>Router</code></td><td>User-facing liquidity and swap entrypoint</td><td>Yes</td><td>Owner pause/unpause</td><td>Can create missing pools on add-liquidity flows.</td></tr>
          <tr><td><code>RouterV2</code></td><td>Direct and 2-hop best-path selection</td><td>Yes</td><td>Owner pause/unpause</td><td>Delegates final execution to Router.</td></tr>
          <tr><td><code>PriceOracle</code></td><td>TWAP observation storage and consultation</td><td>Yes</td><td>Owner pause/unpause</td><td>Pull-based updates; not automatic.</td></tr>
          <tr><td><code>FeeCollector</code></td><td>Protocol treasury for accumulated ERC20 fees</td><td>Yes</td><td>Owner withdraw, batch withdraw, emergency withdraw</td><td>Emergency withdraw works only while paused.</td></tr>
          <tr><td><code>FlashLoanLimiter</code></td><td>Flash-swap max-out percentage policy</td><td>Yes</td><td>Owner default/per-pool limits</td><td>Optional but recommended safety module.</td></tr>
          <tr><td><code>DEXGovernance</code></td><td>Timelocked executor for selected factory admin actions</td><td>Yes</td><td>Owner queue/execute/cancel</td><td>Delay-based replay protection via action hashes.</td></tr>
          <tr><td><code>LiquidityMining</code></td><td>Optional LP staking rewards</td><td>Yes</td><td>Owner emission control</td><td>Extension, not required for core swap flows.</td></tr>
          <tr><td><code>DEXTransparentProxyFactory</code></td><td>Deployment helper for implementation + ProxyAdmin + proxy</td><td>No</td><td>Deployment scripts only</td><td>Stateless utility contract.</td></tr>
          <tr><td><code>DEXErrors</code></td><td>Shared custom error catalog</td><td>No</td><td>Source-level import only</td><td>Used across core, governance, oracle, treasury, and extensions.</td></tr>
        </tbody>
      </table>
    `,
  },
  {
    slug: "pool-factory",
    group: "Contracts",
    title: "PoolFactory",
    summary: "Pair registry, global fee config, fee receiver, flash limiter, and protocol pause root.",
    content: `
      <h1>PoolFactory</h1>
      <p class="lead">PoolFactory is the control center of the AMM. It creates pools, enforces one-pair-one-pool registry semantics, exposes global fee and treasury config, and acts as the protocol-wide pause root consumed by pools and routers.</p>

      <h2>Important state</h2>
      <table>
        <thead>
          <tr><th>Field</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td><code>WETH</code></td><td>Wrapped ETH address shared across pools and routers.</td></tr>
          <tr><td><code>swapFeeBps</code></td><td>Total swap fee basis points used by pools.</td></tr>
          <tr><td><code>protocolFeeBps</code></td><td>Protocol share of the total swap fee.</td></tr>
          <tr><td><code>feeReceiver</code></td><td>Address receiving the protocol fee portion.</td></tr>
          <tr><td><code>flashLoanLimiter</code></td><td>Optional policy contract for flash-swap output caps.</td></tr>
          <tr><td><code>getPool[token0][token1]</code></td><td>Canonical pair registry mapping.</td></tr>
          <tr><td><code>allPools</code></td><td>Enumerable list of all deployed pool addresses.</td></tr>
        </tbody>
      </table>

      <h2>Default initialization values</h2>
      <ul>
        <li><code>swapFeeBps = 30</code></li>
        <li><code>protocolFeeBps = 0</code></li>
        <li><code>feeReceiver = owner</code></li>
      </ul>

      <h2>Primary methods</h2>
      <table>
        <thead>
          <tr><th>Method</th><th>Behavior</th></tr>
        </thead>
        <tbody>
          <tr><td><code>initialize(owner, weth)</code></td><td>Sets ownership, pause state, WETH address, and fee defaults.</td></tr>
          <tr><td><code>createPool(tokenA, tokenB)</code></td><td>Sorts tokens, rejects duplicates, deploys immutable LiquidityPool, updates both token-order mappings.</td></tr>
          <tr><td><code>setFeeConfig(swapFeeBps, protocolFeeBps, feeReceiver)</code></td><td>Validates fee relationships and updates protocol-wide fee state.</td></tr>
          <tr><td><code>setFlashLoanLimiter(limiter)</code></td><td>Sets an external limiter contract for flash-swap validation.</td></tr>
          <tr><td><code>pause()</code> / <code>unpause()</code></td><td>Toggles protocol-level pause state consumed by dependent modules.</td></tr>
        </tbody>
      </table>

      <h2>Operational notes</h2>
      <ul>
        <li>Pair addresses are sorted lexicographically, so integrations should never assume input order matters.</li>
        <li>Protocol fee cannot exceed total swap fee.</li>
        <li>If protocol fee is non-zero, <code>feeReceiver</code> must be a valid non-zero address.</li>
        <li>Factory ownership is a high-impact authority because it controls fees, limiter updates, and the root pause flag.</li>
      </ul>

      <div class="callout danger">
        <strong>Critical boundary:</strong> the factory is the closest thing the protocol has to a global mutable config registry. Compromise here affects all pools and router execution even though the pools themselves are immutable.
      </div>
    `,
  },
  {
    slug: "liquidity-pool",
    group: "Contracts",
    title: "LiquidityPool",
    summary: "Immutable pair contract for reserves, swaps, LP shares, cumulative prices, and flash swaps.",
    content: `
      <h1>LiquidityPool</h1>
      <p class="lead">LiquidityPool is the actual market. It holds reserves, mints and burns LP shares, executes swap math, tracks cumulative prices, and exposes flash-swap functionality. Every pool is immutable and created directly by the factory.</p>

      <h2>Core characteristics</h2>
      <ul>
        <li><strong>ERC20 LP token:</strong> the pool contract itself is the LP token with symbol <code>ASLP</code>.</li>
        <li><strong>Immutable pair metadata:</strong> <code>tokenA</code>, <code>tokenB</code>, <code>WETH</code>, and <code>factory</code> are constructor immutables.</li>
        <li><strong>Reserve state:</strong> tracked in <code>reserveA</code> and <code>reserveB</code>.</li>
        <li><strong>Oracle support:</strong> cumulative prices are stored in <code>priceACumulativeLast</code> and <code>priceBCumulativeLast</code>.</li>
      </ul>

      <h2>Main write paths</h2>
      <table>
        <thead>
          <tr><th>Method</th><th>Use case</th><th>Important behavior</th></tr>
        </thead>
        <tbody>
          <tr><td><code>addLiquidity</code></td><td>Direct pool-side liquidity add</td><td>Transfers tokens from caller, computes received balance deltas, mints LP shares.</td></tr>
          <tr><td><code>addLiquidityFromBalances</code></td><td>Router-assisted liquidity add</td><td>Assumes tokens were pre-sent to the pool and mints from current balances.</td></tr>
          <tr><td><code>removeLiquidity</code></td><td>LP redemption</td><td>Burns LP shares and sends proportional reserves back to caller.</td></tr>
          <tr><td><code>swap</code></td><td>Exact-input token swap</td><td>Uses current balance delta to infer input amount.</td></tr>
          <tr><td><code>flashSwap</code></td><td>Borrow-and-repay in one transaction</td><td>Transfers out tokens, optionally calls back, validates repayment and invariant.</td></tr>
          <tr><td><code>swapExactETHForTokens</code></td><td>Pool-local ETH helper</td><td>Wraps ETH into WETH and swaps only if the pair includes WETH.</td></tr>
          <tr><td><code>swapExactTokensForETH</code></td><td>Pool-local token-to-ETH helper</td><td>Rejects WETH as input side and unwraps final WETH to ETH.</td></tr>
          <tr><td><code>sync</code></td><td>Reserve maintenance</td><td>Forces reserves to match balances.</td></tr>
          <tr><td><code>skim(to)</code></td><td>Dust recovery</td><td>Transfers excess token balances beyond reserves to a recipient.</td></tr>
        </tbody>
      </table>

      <h2>Quoting and oracle helpers</h2>
      <ul>
        <li><code>quote</code> returns a pure proportional quote.</li>
        <li><code>getAmountOut</code> computes output using current fee config from the factory.</li>
        <li><code>previewSwap</code> exposes a view on current swap output.</li>
        <li><code>currentCumulativePrices</code> is the oracle-facing observation source.</li>
      </ul>

      <h2>Flash swap details</h2>
      <ul>
        <li>Caller can borrow <code>amountAOut</code>, <code>amountBOut</code>, or both as long as reserves are sufficient.</li>
        <li>Optional callback executes through <code>IFlashSwapCallee.flashSwapCall</code>.</li>
        <li>Returned balances are measured after callback completion.</li>
        <li>Optional flash limiter is consulted through the factory config before execution proceeds.</li>
      </ul>

      <div class="callout info">
        <strong>Integration pattern:</strong> Router uses <code>addLiquidityFromBalances</code> and pre-transfers tokens into the pool, which keeps pool logic simple and avoids duplicate ratio calculation in multiple places.
      </div>
    `,
  },
  {
    slug: "router",
    group: "Contracts",
    title: "Router",
    summary: "Canonical user-facing layer for liquidity adds/removals, swaps, ETH helpers, and quoting.",
    content: `
      <h1>Router</h1>
      <p class="lead">Router is the main user entrypoint and the contract most frontends should integrate against. It owns no long-term market state beyond factory and WETH references, but it coordinates pool discovery, token transfers, quote calculation, and multi-hop execution.</p>

      <h2>Capabilities</h2>
      <ul>
        <li><strong>Liquidity:</strong> <code>addLiquidity</code>, <code>addLiquidityETH</code>, <code>removeLiquidity</code>, <code>removeLiquidityETH</code>.</li>
        <li><strong>Swaps:</strong> <code>swapExactTokensForTokens</code>, <code>swapExactTokensForTokensWithHopMin</code>, <code>swapExactETHForTokens</code>, <code>swapExactTokensForETH</code>.</li>
        <li><strong>Quotes:</strong> <code>getAmountsOut</code> across arbitrary provided paths.</li>
      </ul>

      <h2>Behavior that matters</h2>
      <table>
        <thead>
          <tr><th>Behavior</th><th>Why it matters</th></tr>
        </thead>
        <tbody>
          <tr><td>Creates missing pools on add-liquidity paths</td><td>Initial pool creation can happen during the first liquidity action instead of a separate factory-only UI step.</td></tr>
          <tr><td>Checks both local pause and factory pause</td><td>Router can be stopped independently, but it also respects protocol-wide emergency pause.</td></tr>
          <tr><td>Returns unused ETH on <code>addLiquidityETH</code></td><td>Excess ETH sent above the actual ratio requirement is refunded to the caller.</td></tr>
          <tr><td>Supports hop-level minimum outputs</td><td>Integrators can defend against poor intermediate execution, not just poor final output.</td></tr>
        </tbody>
      </table>

      <h2>Recommended integration sequence</h2>
      <ol>
        <li>Resolve active network and all proxy addresses first.</li>
        <li>Pre-read route or reserve data using <code>getAmountsOut</code>.</li>
        <li>Collect user slippage tolerance and convert it into <code>amountOutMin</code> or hop minimums.</li>
        <li>Ensure token allowance is set when ERC20 input is required.</li>
        <li>Send the write call with a short deadline.</li>
      </ol>

      <h2>When not to call the pool directly</h2>
      <ul>
        <li>When working with multi-hop paths.</li>
        <li>When using ETH entry or exit flows.</li>
        <li>When you want the router to create the pool automatically on first liquidity provision.</li>
      </ul>
    `,
  },
  {
    slug: "router-v2",
    group: "Contracts",
    title: "RouterV2",
    summary: "Best-path wrapper over Router for direct and candidate-based 2-hop swaps.",
    content: `
      <h1>RouterV2</h1>
      <p class="lead">RouterV2 is an optimization layer, not a replacement for Router. It looks at the direct pair and at candidate intermediary tokens, then picks the best output route among those direct and 2-hop options.</p>

      <h2>Primary methods</h2>
      <table>
        <thead>
          <tr><th>Method</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td><code>getBestPathOut(amountIn, tokenIn, tokenOut, candidates)</code></td><td>Returns the selected path and best quoted output.</td></tr>
          <tr><td><code>swapBestTokensForTokens(...)</code></td><td>Pulls input tokens, approves Router, and executes the best path.</td></tr>
          <tr><td><code>pause()</code> / <code>unpause()</code></td><td>Local operational control over RouterV2-specific writes.</td></tr>
        </tbody>
      </table>

      <h2>Selection logic</h2>
      <ol>
        <li>Score the direct path <code>tokenIn -&gt; tokenOut</code>.</li>
        <li>Iterate over candidate intermediaries.</li>
        <li>For each candidate, quote <code>tokenIn -&gt; candidate</code> and then <code>candidate -&gt; tokenOut</code>.</li>
        <li>Keep the path with the highest quoted output.</li>
        <li>Delegate the actual execution to Router using the selected path.</li>
      </ol>

      <h2>Limits and tradeoffs</h2>
      <ul>
        <li>No full-graph path search.</li>
        <li>No more than 2 hops.</li>
        <li>Result quality depends entirely on the supplied candidate list.</li>
        <li>Still blocked by factory pause even if RouterV2 itself is unpaused.</li>
      </ul>

      <div class="callout warning">
        <strong>Practical guidance:</strong> feed RouterV2 only highly liquid, widely reused candidate tokens. A large, low-quality candidate list increases RPC reads without guaranteeing better execution.
      </div>
    `,
  },
  {
    slug: "price-oracle",
    group: "Contracts",
    title: "PriceOracle",
    summary: "Pull-based TWAP snapshots over pool cumulative prices.",
    content: `
      <h1>PriceOracle</h1>
      <p class="lead">PriceOracle is a pull-based TWAP module. It does not automatically update itself. Instead, an operator or integration periodically calls <code>update(pool)</code>, which snapshots cumulative pool prices and derives time-weighted average values.</p>

      <h2>Observation structure</h2>
      <table>
        <thead>
          <tr><th>Field</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td><code>priceACumulative</code></td><td>Last observed cumulative price for tokenA.</td></tr>
          <tr><td><code>priceBCumulative</code></td><td>Last observed cumulative price for tokenB.</td></tr>
          <tr><td><code>timestamp</code></td><td>Timestamp of the last observation.</td></tr>
          <tr><td><code>twapA</code> / <code>twapB</code></td><td>Latest computed TWAP values for both directions.</td></tr>
          <tr><td><code>initialized</code></td><td>Marks whether the first snapshot has been stored.</td></tr>
        </tbody>
      </table>

      <h2>Update cycle</h2>
      <ol>
        <li>First <code>update(pool)</code> call initializes the observation and stores cumulative baselines.</li>
        <li>Second and later calls compare new cumulative values to the stored baseline.</li>
        <li>Elapsed time is used to compute fresh <code>twapA</code> and <code>twapB</code>.</li>
        <li><code>consult(pool, amountIn, tokenIn)</code> uses the latest TWAP for quoting.</li>
      </ol>

      <h2>Important guards</h2>
      <ul>
        <li><code>StaleObservation</code> if two updates happen with zero elapsed time.</li>
        <li><code>NotInitialized</code> if <code>consult</code> is called before a real TWAP exists.</li>
        <li>Pause state blocks updates.</li>
      </ul>

      <h2>Operational recommendation</h2>
      <p>Use a consistent update cadence for the pools you care about. Sparse updates reduce usefulness, while excessively frequent updates can trigger stale-interval failures or waste gas.</p>
    `,
  },
  {
    slug: "fee-collector",
    group: "Contracts",
    title: "FeeCollector",
    summary: "Protocol treasury vault for accumulated ERC20 fee balances.",
    content: `
      <h1>FeeCollector</h1>
      <p class="lead">FeeCollector is the protocol treasury endpoint. Pools forward protocol fee share to the configured receiver, and this module then exposes controlled withdrawal paths for normal operations and incident response.</p>

      <h2>Methods</h2>
      <table>
        <thead>
          <tr><th>Method</th><th>When to use it</th></tr>
        </thead>
        <tbody>
          <tr><td><code>withdraw(token, recipient, amount)</code></td><td>Normal single-asset treasury withdrawal while unpaused.</td></tr>
          <tr><td><code>batchWithdraw(tokens, recipients, amounts)</code></td><td>Operational batch payout or treasury rebalance while unpaused.</td></tr>
          <tr><td><code>emergencyWithdraw(token, recipient, amount)</code></td><td>Emergency evacuation path available only while paused.</td></tr>
          <tr><td><code>pause()</code> / <code>unpause()</code></td><td>Operational control over treasury write paths.</td></tr>
        </tbody>
      </table>

      <h2>Rules worth remembering</h2>
      <ul>
        <li>Recipient must be non-zero.</li>
        <li>Amount must be non-zero.</li>
        <li>Contract balance must be sufficient or the call reverts with <code>InsufficientContractBalance</code>.</li>
        <li>Emergency withdraw is intentionally inverted: it is available only when the contract is paused.</li>
      </ul>

      <div class="callout info">
        <strong>Operational pattern:</strong> if the protocol uses a multisig or treasury workflow, FeeCollector should usually point toward a controlled downstream destination rather than serving as the long-term cold-storage vault itself.
      </div>
    `,
  },
  {
    slug: "flash-limiter",
    group: "Contracts",
    title: "FlashLoanLimiter",
    summary: "Optional policy contract that caps flash-swap output size in basis points of reserves.",
    content: `
      <h1>FlashLoanLimiter</h1>
      <p class="lead">FlashLoanLimiter is a pure policy module. It does not custody assets and does not perform flash swaps itself. Instead, pools can consult it before allowing a flash swap to ensure output size stays below configured percentages of pool reserves.</p>

      <h2>Policy model</h2>
      <ul>
        <li><code>defaultMaxOutBps</code> defines the default maximum borrow size relative to reserves.</li>
        <li><code>poolMaxOutBps[pool]</code> can override the default for specific pools.</li>
        <li>The denominator is <code>BPS = 10_000</code>.</li>
      </ul>

      <h2>Main methods</h2>
      <table>
        <thead>
          <tr><th>Method</th><th>Effect</th></tr>
        </thead>
        <tbody>
          <tr><td><code>setDefaultLimit(maxOutBps)</code></td><td>Updates the default cap for all pools without overrides.</td></tr>
          <tr><td><code>setPoolLimit(pool, maxOutBps)</code></td><td>Sets a custom cap for one specific pool.</td></tr>
          <tr><td><code>validateFlashSwap(pool, ..., reserveA, reserveB, amountAOut, amountBOut)</code></td><td>Reverts with <code>LimitExceeded</code> if the requested borrow is too large.</td></tr>
        </tbody>
      </table>

      <h2>Why it exists</h2>
      <ul>
        <li>Constrains extreme flash extraction relative to reserves.</li>
        <li>Lets operations teams tune risk by market.</li>
        <li>Keeps flash policy separate from immutable pool logic.</li>
      </ul>

      <div class="callout warning">
        <strong>Pause behavior:</strong> limiter validation itself is blocked when the limiter is paused. If the factory still points at a paused limiter, flash swaps that depend on it will fail until the limiter is unpaused or the factory config changes.
      </div>
    `,
  },
  {
    slug: "dex-governance",
    group: "Contracts",
    title: "DEXGovernance",
    summary: "Timelocked executor for selected PoolFactory admin actions.",
    content: `
      <h1>DEXGovernance</h1>
      <p class="lead">DEXGovernance is not a token-voting governor. It is a timelocked admin executor focused on a very small set of factory-level changes: fee config, emergency pause, and flash-loan limiter updates.</p>

      <h2>Stored state</h2>
      <ul>
        <li><code>factory</code>: controlled PoolFactory admin interface.</li>
        <li><code>minDelay</code>: minimum delay before queued actions may execute.</li>
        <li><code>queuedActions[actionId]</code>: mapping from action hash to earliest execution timestamp.</li>
      </ul>

      <h2>Supported actions</h2>
      <table>
        <thead>
          <tr><th>Queue</th><th>Execute</th><th>Target effect</th></tr>
        </thead>
        <tbody>
          <tr><td><code>queueSetFeeConfig</code></td><td><code>executeSetFeeConfig</code></td><td>Updates swap fee, protocol fee, and fee receiver in PoolFactory.</td></tr>
          <tr><td><code>queueSetEmergencyPause</code></td><td><code>executeSetEmergencyPause</code></td><td>Pauses or unpauses PoolFactory.</td></tr>
          <tr><td><code>queueSetFlashLoanLimiter</code></td><td><code>executeSetFlashLoanLimiter</code></td><td>Updates the factory's flash limiter pointer.</td></tr>
        </tbody>
      </table>

      <h2>Lifecycle</h2>
      <ol>
        <li>Owner encodes an action into an <code>actionId</code> via <code>keccak256</code>.</li>
        <li><code>_queue</code> stores <code>block.timestamp + minDelay</code>.</li>
        <li>After the delay, the matching execute function calls <code>_consume</code>.</li>
        <li>The target factory admin method is executed.</li>
      </ol>

      <h2>Operational notes</h2>
      <ul>
        <li>Duplicate queued actions are rejected.</li>
        <li>Actions can be canceled before execution.</li>
        <li>Default deployment config suggests <code>GOV_MIN_DELAY = 3600</code> seconds unless a different value was supplied at deployment time.</li>
      </ul>

      <div class="callout danger">
        <strong>Important:</strong> governance timelock reduces surprise changes but does not remove key risk. The owner of DEXGovernance is still the authority able to queue, execute, and cancel actions.
      </div>
    `,
  },
  {
    slug: "liquidity-mining",
    group: "Contracts",
    title: "LiquidityMining",
    summary: "Optional rewards extension for staking LP tokens and streaming emissions.",
    content: `
      <h1>LiquidityMining</h1>
      <p class="lead">LiquidityMining is an optional extension, not a required dependency of the swap engine. It lets LPs stake pool shares and earn a reward token over time using the familiar <code>accRewardPerShare</code> accounting model.</p>

      <h2>Main variables</h2>
      <ul>
        <li><code>lpToken</code>: staked LP asset.</li>
        <li><code>rewardToken</code>: token paid out as emissions.</li>
        <li><code>rewardPerSecond</code>: emission speed.</li>
        <li><code>accRewardPerShare</code>: cumulative rewards-per-share accumulator.</li>
        <li><code>users[account]</code>: per-account stake amount and reward debt.</li>
      </ul>

      <h2>Core methods</h2>
      <table>
        <thead>
          <tr><th>Method</th><th>Behavior</th></tr>
        </thead>
        <tbody>
          <tr><td><code>deposit(amount)</code></td><td>Harvests pending rewards, pulls LP tokens, updates user position.</td></tr>
          <tr><td><code>withdraw(amount)</code></td><td>Harvests, reduces position, returns LP tokens.</td></tr>
          <tr><td><code>claim()</code></td><td>Harvests rewards without changing the staked amount.</td></tr>
          <tr><td><code>pendingRewards(account)</code></td><td>View-only projection of claimable rewards.</td></tr>
          <tr><td><code>setRewardPerSecond(value)</code></td><td>Owner-controlled emission update after refreshing pool accounting.</td></tr>
        </tbody>
      </table>

      <h2>Deployment and ops considerations</h2>
      <ul>
        <li>The reward token balance must actually exist in the contract; emissions are not auto-minted.</li>
        <li>Setting emission too high without funding creates payout failure risk.</li>
        <li>Pause control can freeze deposits, withdrawals, and claims during incidents.</li>
      </ul>
    `,
  },
  {
    slug: "sepolia-addresses",
    group: "Deployment",
    title: "Sepolia Deployment",
    summary: "Current proxy, ProxyAdmin, and implementation addresses for the Sepolia environment.",
    content: `
      <h1>Sepolia Deployment</h1>
      <p class="lead">This page records the current Sepolia deployment snapshot supplied for the docs build. Treat it as the canonical address manifest for the environment represented by this repository until a newer deployment replaces it.</p>

      <h2>Core addresses</h2>
      <table class="address-table">
        <thead>
          <tr><th>Contract</th><th>Address</th></tr>
        </thead>
        <tbody>
          <tr><td>PoolFactory proxy</td><td><code>0x4f76a0804AbBb6E62d1b7982b0E65465E13FbAf0</code></td></tr>
          <tr><td>Router proxy</td><td><code>0x0518EC58b0c4EFa2C8D137868a5218e3bB378160</code></td></tr>
          <tr><td>RouterV2 proxy</td><td><code>0x70226408182d6a985A2B30188f5f8C73e1028B5D</code></td></tr>
          <tr><td>PriceOracle proxy</td><td><code>0xB80Cc38f2CFd15Cdc577AFb1aA48B08F7b2A8894</code></td></tr>
          <tr><td>FeeCollector proxy</td><td><code>0xAdD92cA4b314758ECCBFc8c7d4D5950D595152a7</code></td></tr>
          <tr><td>FlashLoanLimiter proxy</td><td><code>0xEEC0eD80Ec6482C0Eeef44B2dB9c480056700597</code></td></tr>
          <tr><td>DEXGovernance proxy</td><td><code>0xAa1A84CA9F9186cDC78526332bc77367C9Aad8bD</code></td></tr>
        </tbody>
      </table>

      <h2>ProxyAdmin per proxy</h2>
      <table class="address-table">
        <thead>
          <tr><th>Proxy</th><th>ProxyAdmin</th></tr>
        </thead>
        <tbody>
          <tr><td>PoolFactory</td><td><code>0xcbB976986f77E23F58C3EFDe258ae1782832c656</code></td></tr>
          <tr><td>Router</td><td><code>0x0992185B8d9F12d06643cE57bd0DF41f33fF487a</code></td></tr>
          <tr><td>RouterV2</td><td><code>0x9e8DF19c87C5B31567B4B20EAb33ed5E16c10bac</code></td></tr>
          <tr><td>PriceOracle</td><td><code>0x2f3D6f7b6c268f775776152DE2D6dC7D2B596ace</code></td></tr>
          <tr><td>FeeCollector</td><td><code>0x6d7564318daF9D53f096185EA7C6daF40b0707D3</code></td></tr>
          <tr><td>FlashLoanLimiter</td><td><code>0xEc0eaDb1eeEbc9d7dA7f064256012b7f9C59B33C</code></td></tr>
          <tr><td>DEXGovernance</td><td><code>0x0108370Ea5A3AB711595C6884441a3BD84621315</code></td></tr>
        </tbody>
      </table>

      <h2>Current implementations</h2>
      <table class="address-table">
        <thead>
          <tr><th>Proxy</th><th>Implementation</th></tr>
        </thead>
        <tbody>
          <tr><td>PoolFactory</td><td><code>0x2bd97c87FCE5DeD03C48FE8631318BE25cf227B1</code></td></tr>
          <tr><td>Router</td><td><code>0xC5d67AE9E7e517b5bD824Ba85C53156BB65a9cf4</code></td></tr>
          <tr><td>RouterV2</td><td><code>0x7eA10AE5f26f378472da3e1Ce3E4227d13eD0B3A</code></td></tr>
          <tr><td>PriceOracle</td><td><code>0x7636d4b4DB03c6c9E3c72Cb7f532203D3515db51</code></td></tr>
          <tr><td>FeeCollector</td><td><code>0x7f3E2F2affb3eD782eC15Cf6D8c0dc47c10f9f7f</code></td></tr>
          <tr><td>FlashLoanLimiter</td><td><code>0x8666C9B0450B351C8A215E539c2F52241674Ec21</code></td></tr>
          <tr><td>DEXGovernance</td><td><code>0xbe5621cAFb74Ed005349045c53B4C7EB899edc97</code></td></tr>
        </tbody>
      </table>

      <h2>Deployment notes</h2>
      <ul>
        <li>Network target in the source repo is Sepolia.</li>
        <li>WETH is a standalone contract, not an upgradeable proxy in this manifest.</li>
        <li>Each upgradeable proxy has its own dedicated ProxyAdmin, which reduces shared-upgrade blast radius.</li>
        <li>After every upgrade, verify EIP-1967 implementation and admin slots match this page or the updated release manifest.</li>
      </ul>

      <div class="callout danger">
        <strong>Address hygiene:</strong> stale proxy or implementation addresses are one of the fastest ways to brick integrations. Keep frontend env files, scripts, and documentation in sync.
      </div>
    `,
  },
  {
    slug: "upgradeability",
    group: "Deployment",
    title: "Upgradeability",
    summary: "Transparent proxy model, dedicated ProxyAdmins, and safe upgrade workflow.",
    content: `
      <h1>Upgradeability</h1>
      <p class="lead">AlsoSwap uses the transparent proxy pattern for mutable core modules. Liquidity pools remain immutable, while service-layer contracts can evolve behind proxies as long as storage layout remains compatible.</p>

      <h2>Modules behind proxies</h2>
      <ul>
        <li>PoolFactory</li>
        <li>Router</li>
        <li>RouterV2</li>
        <li>PriceOracle</li>
        <li>FeeCollector</li>
        <li>FlashLoanLimiter</li>
        <li>DEXGovernance</li>
        <li>LiquidityMining</li>
      </ul>

      <h2>What changes on upgrade vs config change</h2>
      <table>
        <thead>
          <tr><th>Change type</th><th>What changes</th><th>What does not change</th></tr>
        </thead>
        <tbody>
          <tr><td>Proxy upgrade</td><td>Implementation code behind a mutable module such as Router or Oracle.</td><td>Proxy address, stored state in the proxy, and all immutable LiquidityPool bytecode.</td></tr>
          <tr><td>Factory fee config update</td><td>Runtime values for <code>swapFeeBps</code>, <code>protocolFeeBps</code>, and <code>feeReceiver</code>.</td><td>LiquidityPool bytecode stays immutable, but future swaps read the new config from the factory.</td></tr>
        </tbody>
      </table>

      <h2>Why immutable pools still react to global config</h2>
      <ul>
        <li>LiquidityPool bytecode is immutable, but it does not hardcode fee values.</li>
        <li>On every swap and flash path the pool calls <code>_feeConfig()</code>, which reads <code>swapFeeBps</code>, <code>protocolFeeBps</code>, and <code>feeReceiver</code> from the factory.</li>
        <li>The result is an intentionally split model: immutable execution engine in the pool, mutable protocol policy in the factory.</li>
        <li>This is why fee changes can affect all future pool trades without upgrading each pool contract.</li>
      </ul>

      <h2>What the deployment helper does</h2>
      <ul>
        <li>Deploys implementation bytecode.</li>
        <li>Deploys a dedicated ProxyAdmin for that proxy.</li>
        <li>Deploys the proxy with encoded initializer calldata.</li>
      </ul>

      <h2>Safe upgrade checklist</h2>
      <ol>
        <li>Confirm storage layout compatibility of the new implementation.</li>
        <li>Confirm target <code>PROXY</code> and <code>PROXY_ADMIN</code> values.</li>
        <li>Confirm the signer is the owner of the target ProxyAdmin.</li>
        <li>Execute the upgrade, optionally with an initialization call if the new version requires it.</li>
        <li>Verify implementation slot changed correctly.</li>
        <li>Run smoke tests against critical reads and writes.</li>
      </ol>

      <h2>Source command pattern</h2>
      <pre><code>PROXY_ADMIN=0x...
PROXY=0x...
IMPL=RouterV3
npm run upgrade:dex:local</code></pre>

      <h2>Common failure modes</h2>
      <ul>
        <li>Using an implementation contract name that does not match the compiled artifact.</li>
        <li>Running the upgrade from a non-owner signer.</li>
        <li>Forgetting that local addresses change after a dev chain restart.</li>
        <li>Breaking storage layout by reordering or deleting state variables in upgradeable contracts.</li>
      </ul>

      <div class="callout warning">
        <strong>Never batch blindly:</strong> combine one implementation change with one explicit verification pass. Upgrades are already high-impact; stacking them with unrelated config edits makes rollback and diagnosis materially harder.
      </div>
    `,
  },
  {
    slug: "admin-ops",
    group: "Operations",
    title: "Admin Operations",
    summary: "Daily checks, control planes, and disciplined parameter management.",
    content: `
      <h1>Admin Operations</h1>
      <p class="lead">Admin work in AlsoSwap is mostly about discipline: knowing which contract owns which lever, verifying that live state matches expected deployment config, and keeping every privileged action traceable.</p>

      <h2>Daily checks</h2>
      <ol>
        <li>Confirm all critical proxies respond and the correct chain is selected.</li>
        <li>Read factory pause status and router pause status.</li>
        <li>Read fee config: <code>swapFeeBps</code>, <code>protocolFeeBps</code>, <code>feeReceiver</code>.</li>
        <li>Confirm oracle snapshots for active pools are still updating.</li>
        <li>Confirm treasury balances and recent withdrawals are expected.</li>
      </ol>

      <h2>Control planes</h2>
      <table>
        <thead>
          <tr><th>Plane</th><th>Owned by</th><th>Effect</th></tr>
        </thead>
        <tbody>
          <tr><td>Factory pause</td><td>PoolFactory owner or DEXGovernance action</td><td>Stops pools and routers that check protocol pause.</td></tr>
          <tr><td>Router local pause</td><td>Router owner</td><td>Stops router entrypoints even if factory is live.</td></tr>
          <tr><td>RouterV2 local pause</td><td>RouterV2 owner</td><td>Stops best-path wrapper only.</td></tr>
          <tr><td>Oracle pause</td><td>PriceOracle owner</td><td>Stops new TWAP updates.</td></tr>
          <tr><td>Treasury pause</td><td>FeeCollector owner</td><td>Stops normal withdrawals and enables emergency-only flow.</td></tr>
          <tr><td>Governance pause</td><td>DEXGovernance owner</td><td>Stops queue and execute actions inside governance.</td></tr>
        </tbody>
      </table>

      <h2>Parameter management rules</h2>
      <ul>
        <li>Document why the change is needed before sending the transaction.</li>
        <li>Change one high-impact parameter set at a time.</li>
        <li>Capture tx hashes, signer, and resulting on-chain values.</li>
        <li>Update this docs site and environment manifests immediately after changes.</li>
      </ul>
    `,
  },
  {
    slug: "security-model",
    group: "Operations",
    title: "Security Model",
    summary: "Runtime protections, key risks, and the protocol’s current tradeoffs.",
    content: `
      <h1>Security Model</h1>
      <p class="lead">AlsoSwap is engineered with standard Solidity protections and structured operational controls, but it remains a Sepolia-first protocol stack and should be treated with the appropriate environment assumptions.</p>

      <h2>Runtime protections</h2>
      <ul>
        <li><strong>Reentrancy guards:</strong> used on critical mutative paths in routers and pools.</li>
        <li><strong>SafeERC20:</strong> used for token transfers across the protocol.</li>
        <li><strong>Pausable modules:</strong> emergency stop controls exist for factory, routers, oracle, treasury, limiter, governance, and liquidity mining.</li>
        <li><strong>Deadline and slippage checks:</strong> user protection exists on liquidity and swap flows.</li>
        <li><strong>Optional flash limit policy:</strong> flash swap output can be bounded relative to reserves.</li>
      </ul>

      <h2>Key admin risks</h2>
      <table>
        <thead>
          <tr><th>Risk</th><th>Impact</th></tr>
        </thead>
        <tbody>
          <tr><td>ProxyAdmin owner compromise</td><td>Attacker can replace implementation code for the associated proxy.</td></tr>
          <tr><td>Factory owner or governance owner compromise</td><td>Attacker can change fees, pause state, or limiter configuration.</td></tr>
          <tr><td>Treasury owner compromise</td><td>Attacker can withdraw fee balances from FeeCollector.</td></tr>
          <tr><td>Weak operational monitoring</td><td>Suspicious upgrades or config changes may go unnoticed too long.</td></tr>
        </tbody>
      </table>

      <h2>Known tradeoffs from the current stack</h2>
      <ul>
        <li>The protocol targets Sepolia and developer workflows, not hardened mainnet economics by default.</li>
        <li>Route optimization is limited to direct and 2-hop search in RouterV2.</li>
        <li>Oracle updates are pull-based, so stale operations are possible if no updater runs.</li>
        <li>External audit and public bug bounty are not represented in the source docs as active completed programs.</li>
      </ul>

      <div class="callout danger">
        <strong>Best practice:</strong> owner and ProxyAdmin control should sit behind multisig or hardware-backed operational policy. A single hot key is not an acceptable long-term posture for protocol-critical authority.
      </div>
    `,
  },
  {
    slug: "incident-response",
    group: "Operations",
    title: "Incident Response",
    summary: "Pause-first runbook, triage, patch, verification, and controlled recovery.",
    content: `
      <h1>Incident Response</h1>
      <p class="lead">AlsoSwap incident handling should be fast, boring, and well logged. The protocol already exposes the right primitives: pause controls, upgradeable service modules, treasury emergency paths, and explicit governance action queues.</p>

      <h2>Recommended runbook</h2>
      <ol>
        <li>Detect the issue: abnormal swaps, revert spike, fee drift, suspicious admin tx, oracle failures, or treasury anomalies.</li>
        <li>Pause the smallest effective surface first. If the issue is broad, start with factory pause.</li>
        <li>Capture evidence: block range, tx hashes, affected pools, expected vs actual state.</li>
        <li>Determine whether the fix is configuration-only or requires an implementation upgrade.</li>
        <li>Apply the patch in a rehearsed environment first when time allows.</li>
        <li>Verify read paths, smoke trades, liquidity add/remove, and oracle behavior.</li>
        <li>Unpause in stages and watch the recovery window.</li>
      </ol>

      <h2>Evidence to collect</h2>
      <ul>
        <li>Relevant proxy and implementation addresses.</li>
        <li>Current fee config and pause states.</li>
        <li>Pool reserves before and after abnormal behavior.</li>
        <li>Any recently queued or executed governance actions.</li>
      </ul>

      <h2>Recovery sequence</h2>
      <ul class="flow-list">
        <li>Restore deterministic config first.</li>
        <li>Then validate router execution on a low-risk smoke flow.</li>
        <li>Then confirm oracle and treasury behavior.</li>
        <li>Only after that restore full user access.</li>
      </ul>

      <div class="callout warning">
        <strong>Do not improvise upgrades in production:</strong> even under pressure, storage layout and post-upgrade verification still matter. A rushed bad upgrade can turn a contained incident into a protocol-wide failure.
      </div>
    `,
  },
  {
    slug: "frontend-integration",
    group: "Integration",
    title: "Frontend Integration",
    summary: "Recommended client behavior, preflight checks, and environment handling.",
    content: `
      <h1>Frontend Integration</h1>
      <p class="lead">The frontend should treat contract calls as a two-step process: preflight through authoritative reads, then writes only when the user is on the correct network and all required allowances and status checks pass.</p>

      <h2>Recommended client model</h2>
      <ul>
        <li>Keep one address manifest per network and never mix local and Sepolia values.</li>
        <li>Read live state directly from RPC for all write eligibility checks.</li>
        <li>Expose Router as the default write surface and RouterV2 as an optional best-path helper.</li>
        <li>Map raw contract errors into readable UI messages where possible.</li>
      </ul>

      <h2>Suggested preflight checklist</h2>
      <ol>
        <li>Correct chain ID and wallet network.</li>
        <li>Protocol and module pause states.</li>
        <li>Resolved pool existence or route existence.</li>
        <li>User token allowance for the router.</li>
        <li>User balance for input token and gas token.</li>
        <li>Fresh output quote and slippage tolerance.</li>
      </ol>

      <h2>Data source split</h2>
      <table>
        <thead>
          <tr><th>Use case</th><th>Preferred source</th></tr>
        </thead>
        <tbody>
          <tr><td>Current reserves, fees, pause state, route validity</td><td>Direct RPC reads</td></tr>
          <tr><td>Historical analytics and dashboards</td><td>Indexing layer or custom backend</td></tr>
          <tr><td>TWAP quote for integrations</td><td><code>PriceOracle.consult</code> after confirmed updates</td></tr>
        </tbody>
      </table>

      <h2>Transaction UX recommendations</h2>
      <ul>
        <li>Show the exact route used before execution.</li>
        <li>Display deadline and slippage parameters explicitly.</li>
        <li>Warn users that Sepolia ETH pays gas and the protocol token does not.</li>
        <li>Provide copyable contract addresses for the active environment.</li>
      </ul>
    `,
  },
  {
    slug: "events-indexing",
    group: "Integration",
    title: "Events & Indexing",
    summary: "Canonical event surface, subgraph-friendly entities, and what still requires direct RPC.",
    content: `
      <h1>Events & Indexing</h1>
      <p class="lead">AlsoSwap does not ship a subgraph in this repository, but the contract event surface is sufficient to build one. The important nuance is that not every emitted event has the same authority: pool and factory events describe the canonical market state, while router events are convenience summaries of one execution path.</p>

      <h2>Event sources that matter most</h2>
      <table>
        <thead>
          <tr><th>Module</th><th>Primary events</th><th>Why they matter</th></tr>
        </thead>
        <tbody>
          <tr><td>PoolFactory</td><td><code>PoolCreated</code>, <code>FeeConfigUpdated</code>, <code>FlashLoanLimiterUpdated</code></td><td>Defines market registry and protocol-wide policy changes.</td></tr>
          <tr><td>LiquidityPool</td><td><code>LiquidityAdded</code>, <code>LiquidityRemoved</code>, <code>SwapExecuted</code>, <code>SwapEthForToken</code>, <code>SwapTokenForEth</code>, <code>ProtocolFeePaid</code>, <code>Synced</code>, <code>Skimmed</code></td><td>Canonical economic history for pools, liquidity, fees, and reserve updates.</td></tr>
          <tr><td>Router</td><td><code>RouterLiquidityAdded</code>, <code>RouterLiquidityRemoved</code>, <code>RouterSwap</code></td><td>Useful UI-level execution summaries, but not the sole truth because pools can be called directly.</td></tr>
          <tr><td>RouterV2</td><td><code>BestPathSwap</code></td><td>Shows route-optimizer usage at the user layer.</td></tr>
          <tr><td>PriceOracle</td><td><code>OracleUpdated</code></td><td>Tracks TWAP observation refreshes and timestamps.</td></tr>
          <tr><td>DEXGovernance</td><td><code>ActionQueued</code>, <code>ActionExecuted</code>, <code>ActionCancelled</code></td><td>Governance and timelock audit trail.</td></tr>
          <tr><td>FeeCollector</td><td><code>FeeWithdrawn</code></td><td>Treasury outflow history.</td></tr>
          <tr><td>FlashLoanLimiter</td><td><code>DefaultLimitUpdated</code>, <code>PoolLimitUpdated</code></td><td>Risk policy history for flash limits.</td></tr>
        </tbody>
      </table>

      <h2>Suggested source-of-truth split</h2>
      <ul>
        <li><strong>Canonical market history:</strong> factory and pool events.</li>
        <li><strong>User-flow annotation:</strong> router and RouterV2 events.</li>
        <li><strong>Operational history:</strong> governance, oracle, treasury, limiter, and standard OpenZeppelin pause/ownership events if indexed.</li>
      </ul>

      <h2>What you can read directly on-chain without an indexer</h2>
      <table>
        <thead>
          <tr><th>Question</th><th>Direct RPC answer?</th></tr>
        </thead>
        <tbody>
          <tr><td>Does a pool exist for this pair?</td><td>Yes, via <code>PoolFactory.getPool</code>.</td></tr>
          <tr><td>What are the current reserves?</td><td>Yes, via <code>reserveA</code> and <code>reserveB</code>.</td></tr>
          <tr><td>What are the current fee settings?</td><td>Yes, via factory reads.</td></tr>
          <tr><td>Is the protocol paused?</td><td>Yes, via factory and module pause reads.</td></tr>
          <tr><td>What is the latest oracle snapshot?</td><td>Yes, via <code>observations(pool)</code> or <code>consult</code>.</td></tr>
          <tr><td>What is the current queued ETA for a governance action?</td><td>Yes, via <code>queuedActions(actionId)</code>.</td></tr>
        </tbody>
      </table>

      <h2>What becomes expensive or impractical without an indexer</h2>
      <ul>
        <li>Global historical swap feed across many pools.</li>
        <li>Per-pool volume, fee, and liquidity time series.</li>
        <li>User transaction history aggregated across direct pool calls and router calls.</li>
        <li>Analytics dashboards showing protocol growth over time.</li>
        <li>Complete governance, treasury, and oracle activity timelines in one UI.</li>
      </ul>

      <div class="callout info">
        <strong>Practical rule:</strong> use direct RPC for the current truth and an indexer for historical truth at scale. A subgraph should treat pool events as the canonical market history layer and router events as convenience metadata layered on top.
      </div>
    `,
  },
  {
    slug: "code-examples",
    group: "Integration",
    title: "Code Examples",
    summary: "Practical snippets for quotes, routing, oracle updates, and governance flows.",
    content: `
      <h1>Code Examples</h1>
      <p class="lead">These snippets are templates for integration work. Validate ABI names and addresses in your own repo before using them directly.</p>

      <h2>Read a multi-hop quote</h2>
      <pre><code>const amounts = await router.read.getAmountsOut([
  1_000000000000000000n,
  [tokenIn, midToken, tokenOut],
])</code></pre>

      <h2>Ask RouterV2 for the best path</h2>
      <pre><code>const [bestPath, bestAmountOut] = await routerV2.read.getBestPathOut([
  amountIn,
  tokenIn,
  tokenOut,
  [candidateA, candidateB, candidateC],
])</code></pre>

      <h2>Add liquidity through Router</h2>
      <pre><code>await walletClient.writeContract({
  address: ROUTER,
  abi: routerAbi,
  functionName: "addLiquidity",
  args: [
    tokenA,
    tokenB,
    amountADesired,
    amountBDesired,
    amountAMin,
    amountBMin,
    minShares,
    deadline,
  ],
})</code></pre>

      <h2>Refresh oracle observations</h2>
      <pre><code>await walletClient.writeContract({
  address: PRICE_ORACLE,
  abi: oracleAbi,
  functionName: "update",
  args: [pool],
})</code></pre>

      <h2>Queue and execute a fee change</h2>
      <pre><code>const actionId = await governance.write.queueSetFeeConfig([
  30n,
  5n,
  feeCollector,
])

// wait until minDelay is satisfied

await governance.write.executeSetFeeConfig([
  30n,
  5n,
  feeCollector,
])</code></pre>
    `,
  },
  {
    slug: "config",
    group: "Reference",
    title: "Configuration",
    summary: "Environment variables for networks, deployment, upgrades, and verification.",
    content: `
      <h1>Configuration</h1>
      <p class="lead">The source repo keeps configuration intentionally simple and environment-driven. Separate network manifests and deployment values clearly before running scripts or connecting a frontend.</p>

      <h2>Network variables</h2>
      <table>
        <thead>
          <tr><th>Variable</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td><code>LOCAL_RPC_URL</code></td><td>Local Hardhat RPC, default <code>http://127.0.0.1:8545</code>.</td></tr>
          <tr><td><code>SEPOLIA_RPC_URL</code></td><td>Required when deploying or reading against Sepolia outside local tooling.</td></tr>
          <tr><td><code>DEPLOYER_KEY</code></td><td>Private key for Sepolia deployment signer.</td></tr>
        </tbody>
      </table>

      <h2>Deployment variables</h2>
      <table>
        <thead>
          <tr><th>Variable</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td><code>PROXY_ADMIN_OWNER</code></td><td>Owner of the deployed ProxyAdmin, defaulting to deployer address if not overridden.</td></tr>
          <tr><td><code>WETH_ADDRESS</code></td><td>Existing WETH address. If omitted in local flows, mock WETH can be deployed.</td></tr>
          <tr><td><code>SWAP_FEE_BPS</code></td><td>Default total swap fee, default <code>30</code>.</td></tr>
          <tr><td><code>PROTOCOL_FEE_BPS</code></td><td>Default protocol fee share, default <code>5</code> in config docs.</td></tr>
          <tr><td><code>FLASH_DEFAULT_MAX_OUT_BPS</code></td><td>Default limiter cap, default <code>3000</code>.</td></tr>
          <tr><td><code>GOV_MIN_DELAY</code></td><td>Governance delay, default <code>3600</code>.</td></tr>
          <tr><td><code>TRANSFER_FACTORY_TO_GOVERNANCE</code></td><td>Whether ownership is moved into governance after deployment.</td></tr>
        </tbody>
      </table>

      <h2>Upgrade variables</h2>
      <table>
        <thead>
          <tr><th>Variable</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td><code>PROXY_ADMIN</code></td><td>Target ProxyAdmin address.</td></tr>
          <tr><td><code>PROXY</code></td><td>Target proxy address.</td></tr>
          <tr><td><code>IMPL</code></td><td>New implementation contract name.</td></tr>
          <tr><td><code>CALL</code></td><td>Optional post-upgrade initializer signature.</td></tr>
          <tr><td><code>ARGS</code></td><td>Optional JSON array of arguments for <code>CALL</code>.</td></tr>
          <tr><td><code>GAS_LIMIT</code></td><td>Optional explicit gas limit.</td></tr>
        </tbody>
      </table>

      <h2>Verification variables</h2>
      <ul>
        <li><code>DEX_WETH</code></li>
        <li><code>DEX_FACTORY</code></li>
        <li><code>DEX_ROUTER</code></li>
        <li><code>DEX_ROUTER_V2</code></li>
        <li><code>DEX_ORACLE</code></li>
        <li><code>DEX_FEE_COLLECTOR</code></li>
        <li><code>DEX_FLASH_LIMITER</code></li>
        <li><code>DEX_GOVERNANCE</code></li>
      </ul>
    `,
  },
  {
    slug: "faq",
    group: "Reference",
    title: "FAQ",
    summary: "Short answers to recurring deployment, testing, and naming questions.",
    content: `
      <h1>FAQ</h1>
      <p class="lead">The source docs already answer a few operational questions directly. This page expands them into the version most teams actually need during implementation.</p>

      <h2>Why do local addresses keep changing?</h2>
      <p>Because <code>hardhat node</code> resets chain state when restarted. Fresh local deployments produce fresh proxy and implementation addresses.</p>

      <h2>Why does an upgrade fail even from an owner-looking wallet?</h2>
      <p>Proxy upgrades are authorized by the owner of the relevant <code>ProxyAdmin</code>, not just by the owner of the proxy target contract.</p>

      <h2>Why does Hardhat complain about missing proxy flags?</h2>
      <p>The project scripts rely on environment variables such as <code>PROXY_ADMIN</code> and <code>PROXY</code> instead of custom CLI flags.</p>

      <h2>Do I need a running local node for tests?</h2>
      <p>No. The standard Hardhat test flow uses the in-process network. A standalone node is mainly for persistent manual testing or frontend integration.</p>

      <h2>Is a faucet required for the DEX core?</h2>
      <p>Not for the protocol core itself. Faucets are usually onboarding helpers for demos, testers, or a broader end-user environment.</p>

      <h2>Is AlsoSwap already a mainnet-hardened production protocol?</h2>
      <p>The repository and docs position it as a Sepolia-first, developer-focused protocol stack. Treat it accordingly when evaluating risk.</p>
    `,
  },
  {
    slug: "glossary",
    group: "Reference",
    title: "Glossary",
    summary: "Short definitions for the protocol’s most important terms.",
    content: `
      <h1>Glossary</h1>
      <p class="lead">Quick definitions for recurring terms across the docs and codebase.</p>

      <table>
        <thead>
          <tr><th>Term</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td>AMM</td><td>Automated market maker using reserve-based price discovery instead of an order book.</td></tr>
          <tr><td>LP token</td><td>ERC20 share token representing a liquidity provider’s pro-rata claim on a pool.</td></tr>
          <tr><td>TWAP</td><td>Time-weighted average price computed from cumulative observations over time.</td></tr>
          <tr><td>BPS</td><td>Basis points. <code>1 bps = 0.01%</code>.</td></tr>
          <tr><td>Transparent proxy</td><td>Upgradeable proxy pattern where admin calls and user calls are separated.</td></tr>
          <tr><td>ProxyAdmin</td><td>Admin contract that owns and executes upgrades for a transparent proxy.</td></tr>
          <tr><td>EIP-1967 slot</td><td>Standard storage slot used to store proxy admin and implementation addresses.</td></tr>
          <tr><td>Flash swap</td><td>Borrow-and-return-in-one-transaction path where repayment is validated before completion.</td></tr>
          <tr><td>Slippage</td><td>Difference between expected output and actual execution outcome.</td></tr>
          <tr><td>Fee receiver</td><td>Address receiving the protocol’s configured share of swap fees.</td></tr>
        </tbody>
      </table>
    `,
  },
];
