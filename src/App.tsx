import { useEffect, useState } from "react";
// IMP START - Quick Start
import { Web3Auth } from "@web3auth/modal";
import {
  CHAIN_NAMESPACES,
  IProvider,
  UserInfo,
  WEB3AUTH_NETWORK,
} from "@web3auth/base";
// IMP END - Quick Start
import Web3 from "web3";
import { Contract, ethers, hashMessage, JsonRpcProvider, Wallet } from "ethers";

import "./App.css";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { abi } from "./assets/abis/erc20";
import { CONTRACT_ADDRESS } from "./constants";
import { toast } from "react-toastify";

// IMP START - SDK Initialization
// IMP START - Dashboard Registration
const clientId =
  "BCrqDXodbfN-LAcUdfhNLc7CPeMVup9CrljBTrgOx9oOSlOGfPAkV9O_NfLlxts4ooEorHaJxftFSCgyP16m0sI"; // get from https://dashboard.web3auth.io
// IMP END - Dashboard Registration

const chainConfig = {
  chainId: "0x66eee", // Please use 0x1 for Mainnet
  rpcTarget: process.env.REACT_APP_ARBITRUM_SEPOLIA_RPC_URL || "",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  displayName: "Arbitrum Sepolia",
  blockExplorerUrl: "https://arbiscan.io/",
  ticker: "AETH",
  tickerName: "AETH",
  logo: "https://images.toruswallet.io/arbitrum.svg",
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig: chainConfig },
});

const web3auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.TESTNET,
  privateKeyProvider: privateKeyProvider,
});
// IMP END - SDK Initialization

function App() {
  const [contract, setContract] = useState<Contract | null>(null);
  const [allowance, setAllowance] = useState<string | null>(null);
  const [balanceOf, setBalanceOf] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);

  const [provider, setProvider] = useState<IProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<Partial<UserInfo> | null>(null);
  const [address, setAddress] = useState<string>("");
  const [eth, setEth] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      try {
        // IMP START - SDK Initialization
        await web3auth.initModal();
        // IMP END - SDK Initialization

        setProvider(web3auth.provider);

        if (web3auth.connected) {
          setLoggedIn(true);
        }

        if (!web3auth.provider) {
          throw new Error("Provider not initialized");
        }

        const user: Partial<UserInfo> = await web3auth.getUserInfo();
        setUser(user);

        const w3aProvider: ethers.BrowserProvider = new ethers.BrowserProvider(
          web3auth.provider
        );

        const w3aSigner: ethers.JsonRpcSigner = await w3aProvider.getSigner();
        setSigner(w3aSigner);

        const web3 = new Web3(web3auth.provider as any);

        let initAddress: any = await web3.eth.getAccounts();
        initAddress = initAddress[0];

        setAddress(initAddress);

        setEth(
          web3.utils.fromWei(
            await web3.eth.getBalance(initAddress as string), // Balance is in wei
            "ether"
          )
        );

        const provider: JsonRpcProvider = new JsonRpcProvider(
          process.env.REACT_APP_ARBITRUM_SEPOLIA_RPC_URL
        );

        const signer: ethers.Wallet = new Wallet(
          process.env.REACT_APP_WALLET_PRIVATE_KEY || "",
          provider
        );

        const initContract = new Contract(CONTRACT_ADDRESS, abi, signer);
        setContract(initContract);

        setBalanceOf(await initContract.balanceOf(initAddress));

        setAllowance(
          await initContract.allowance(
            initAddress,
            "0xD96B642Ca70edB30e58248689CEaFc6E36785d68"
          )
        );

        setIsLoading(false);
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const onMint = async () => {
    try {
      setIsMinting(true);
      const message = "Hola, EducatETH pagará el gas por ti ;)";
      const hash = hashMessage(message);
      const signature = await signMessage(message);

      if (!contract) {
        throw new Error("Contract not found");
      }

      const mintTx = await contract.mint(hash, signature, address, 100);
      await mintTx.wait();

      setBalanceOf(await contract.balanceOf(address));

      toast("Minted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Error while minting. Try again.");
    } finally {
      setIsMinting(false);
    }
  };

  const onApprove = async () => {
    try {
      setIsApproving(true);
      const contractUser = new Contract(CONTRACT_ADDRESS, abi, signer);
      const transferFromTx = await contractUser.approve(
        "0xD96B642Ca70edB30e58248689CEaFc6E36785d68",
        100
      );
      await transferFromTx.wait();

      setAllowance(
        await contractUser.allowance(
          address,
          "0xD96B642Ca70edB30e58248689CEaFc6E36785d68"
        )
      );

      toast("Minted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Error while minting. Try again.");
    } finally {
      setIsApproving(false);
    }
  };

  const onTranfer = async () => {
    if (!contract) {
      throw new Error("Contract not found");
    }

    try {
      setIsTransferring(true);
      const transferFromTx = await contract.transferFrom(
        address,
        "0xD96B642Ca70edB30e58248689CEaFc6E36785d68",
        100,
        {
          gasLimit: 1000000,
        }
      );
      await transferFromTx.wait();

      setBalanceOf(await contract.balanceOf(address));
      setAllowance(
        await contract.allowance(
          address,
          "0xD96B642Ca70edB30e58248689CEaFc6E36785d68"
        )
      );

      toast("Minted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Error while minting. Try again.");
    } finally {
      setIsTransferring(false);
    }
  };

  const login = async () => {
    // IMP START - Login
    const web3authProvider = await web3auth.connect();
    // IMP END - Login
    setProvider(web3authProvider);

    if (web3auth.connected) {
      setLoggedIn(true);
    }
  };

  const getUserInfo = async () => {
    // IMP START - Get User Information
    const user: Partial<UserInfo> = await web3auth.getUserInfo();

    uiConsole(user);
  };

  const logout = async () => {
    // IMP START - Logout
    await web3auth.logout();
    // IMP END - Logout
    setProvider(null);
    setLoggedIn(false);
    uiConsole("logged out");
  };

  // IMP START - Blockchain Calls
  const getAccounts = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);

    // Get user's Ethereum public address
    const address = await web3.eth.getAccounts();
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);

    // Get user's Ethereum public address
    const address = (await web3.eth.getAccounts())[0];

    // Get user's balance in ether
    const balance = web3.utils.fromWei(
      await web3.eth.getBalance(address), // Balance is in wei
      "ether"
    );
    uiConsole(balance);
  };

  const signMessage = async (message: string) => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const web3 = new Web3(provider as any);

    // Get user's Ethereum public address
    const fromAddress = (await web3.eth.getAccounts())[0];

    // Sign the message
    const signedMessage = await web3.eth.personal.sign(
      message,
      fromAddress,
      "test password!" // configure your own password here.
    );
    // uiConsole(signedMessage);

    if (!signedMessage) {
      throw new Error("Failed to sign message");
    }

    return signedMessage;
  };
  // IMP END - Blockchain Calls

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
    console.log(...args);
  }

  const loggedInView = (
    <>
      {/* <div className="flex-container"> */}
      {/* <div> */}
      {/* <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={getAccounts} className="card">
            Get Accounts
          </button>
        </div>
        <div>
          <button onClick={getBalance} className="card">
            Get Balance
          </button>
        </div> */}
      {/* <div>
          <button onClick={signMessage} className="card">
            Sign Message
          </button>
        </div> */}
      {/* <div> */}
      <button onClick={logout} className="card">
        Log Out
      </button>
      {/* </div> */}
      {/* </div> */}
    </>
  );

  const unloggedInView = (
    <button onClick={login} className="card">
      Login
    </button>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center w-full">
      <section className="space-y-5">
        <h1 className="text-4xl font-bold text-center">
          🚀 DAPP Token Faucet 🚀
        </h1>
        <div className="grid">{loggedIn ? loggedInView : unloggedInView}</div>
        {/* <div id="console" style={{ whiteSpace: "pre-line" }}>
          <p style={{ whiteSpace: "pre-line" }}></p>
        </div> */}
        {loggedIn && (
          <div className="p-4 border border-zinc-700 flex flex-col gap-5 items-center rounded-xl">
            <div className="flex flex-row gap-5 w-full justify-center items-center">
              <img src={user?.profileImage} alt="Arbitrum" />
              <div className="flex flex-col gap-3 items-left">
                <h2>name: {user?.name}</h2>
                <h3>email: {user?.email}</h3>
              </div>
            </div>
            {/* <ConnectButton showBalance={false} accountStatus={"avatar"} />
          {!isConnected ? (
            <>
              <h2>First make sure your wallet is connected</h2>
            </>
          ) : ( */}
            <div className="flex flex-col gap-5 items-center">
              {/* <p className="text-xl  text-center">
              📇 <span className="font-bold">Address:</span> {address}
            </p> */}
              <div className="flex gap-3 items-center">
                <p className="text-xl  text-center">
                  💰 <span className="font-bold">Balance:</span>{" "}
                  {isLoading ? (
                    <span className="opacity-50">loading...</span>
                  ) : (
                    balanceOf?.toString()
                  )}
                </p>
                <p className="text-xl  text-center">
                  🔖 <span className="font-bold">Allowance:</span>{" "}
                  {isLoading ? (
                    <span className="opacity-50">loading...</span>
                  ) : (
                    allowance?.toString()
                  )}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <button
                  className="py-1 px-3 bg-zinc-800 rounded-lg hover:scale-105 transition-all disabled:opacity-50"
                  onClick={onMint}
                  disabled={isMinting}
                >
                  {isMinting ? "Minting..." : "Mint token"}
                </button>
                <button
                  className="py-1 px-3 bg-zinc-800 rounded-lg hover:scale-105 transition-all disabled:opacity-50"
                  onClick={onApprove}
                  disabled={isApproving}
                >
                  {isApproving ? "Approving..." : "Approve"}
                </button>
                <button
                  className="py-1 px-3 bg-zinc-800 rounded-lg hover:scale-105 transition-all disabled:opacity-50"
                  onClick={onTranfer}
                  disabled={isTransferring}
                >
                  {isTransferring ? "Transfering..." : "Transfer"}
                </button>
              </div>
            </div>
            {/* )} */}
          </div>
        )}
      </section>
    </main>
    // <div className="container">
    //   <h1 className="title">
    //     <a
    //       target="_blank"
    //       href="https://web3auth.io/docs/sdk/pnp/web/modal"
    //       rel="noreferrer"
    //     >
    //       Web3Auth{" "}
    //     </a>
    //     & ReactJS (Webpack) Quick Start
    //   </h1>

    //   <div className="grid">{loggedIn ? loggedInView : unloggedInView}</div>
    //   <div id="console" style={{ whiteSpace: "pre-line" }}>
    //     <p style={{ whiteSpace: "pre-line" }}></p>
    //   </div>

    //   <footer className="footer">
    //     <a
    //       href="https://github.com/Web3Auth/web3auth-pnp-examples/tree/main/web-modal-sdk/quick-starts/react-modal-quick-start"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       Source code
    //     </a>
    //     <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FWeb3Auth%2Fweb3auth-pnp-examples%2Ftree%2Fmain%2Fweb-modal-sdk%2Fquick-starts%2Freact-modal-quick-start&project-name=w3a-evm-modal&repository-name=w3a-evm-modal">
    //       <img src="https://vercel.com/button" alt="Deploy with Vercel" />
    //     </a>
    //   </footer>
    // </div>
  );
}

export default App;
function userRef(arg0: string) {
  throw new Error("Function not implemented.");
}
