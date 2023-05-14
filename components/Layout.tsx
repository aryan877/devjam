import {
  Box,
  Button,
  Container,
  Flex,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from '@chakra-ui/react';
import { connect, disconnect, switchNetwork } from '@wagmi/core';
import { InjectedConnector } from '@wagmi/core/connectors/injected';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { PropsWithChildren, useEffect, useState } from 'react';
import { AiOutlineArrowRight, AiOutlineCaretDown } from 'react-icons/ai';
import { SiweMessage } from 'siwe';
import { useAccount, useNetwork, useSignMessage } from 'wagmi';
import { polygonMumbai } from 'wagmi/chains';
import { useNotification } from '../context/NotificationContext';
import Loader from './Loader';
import LoginPrompt from './LoginPrompt';
import Sidebar from './Sidebar';
import WalletNotConnected from './WalletNotConnected';

const Layout = ({ children }: PropsWithChildren) => {
  const { address, status } = useAccount();
  const [connected, setConnected] = useState<boolean>(false);
  const { chain } = useNetwork();

  const { addNotification } = useNotification();
  const router = useRouter();

  const [state, setState] = useState<{
    loggedInAddress?: string;
    error?: any;
    loading?: boolean;
  }>({ loggedInAddress: '', error: '', loading: false });

  const logout = async () => {
    router.replace('/');
    setState({ loggedInAddress: '', loading: false, error: undefined });
    await fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // add data if needed
    });
  };

  useEffect(() => {
    if (
      !state.loggedInAddress?.startsWith('0x') ||
      !address?.startsWith('0x')
    ) {
      return;
    }
    if (state.loggedInAddress !== address) {
      logout();
    }
  }, [address, state]);

  const { signMessageAsync } = useSignMessage();

  const signIn = async () => {
    try {
      if (!address && !chain) return alert('No account');
      // set loading to true
      setState((x) => ({ ...x, error: undefined, loading: true }));
      const nonceRes = await axios.get('/api/nonce');
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId: chain?.id,
        nonce: await nonceRes.data,
      });
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });
      if (!signature) throw Error('Signature is empty');
      // Verify signature
      const verifyRes = await axios.post(
        '/api/verify',
        {
          message: message,
          signature: signature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      // update the state with the address and set loading to false
      setState((prev) => ({
        ...prev,
        loggedInAddress: address,
        loading: false,
      }));
      addNotification({
        status: 'success',
        title: verifyRes.data.title,
        description: verifyRes.data.message,
        autoClose: true,
      });
    } catch (error: any) {
      setState((prev) => ({ ...prev, error, loading: false }));
      addNotification({
        status: 'error',
        title: 'Log In Failed',
        description: `Sign in was unsuccessful`,
        autoClose: true,
      });
    }
  };

  useEffect(() => {
    // if (!connected) {
    //   return;
    // }
    const handler = async () => {
      try {
        const res = await fetch('/api/me');
        const json = await res.json();
        setState((x) => ({ ...x, loggedInAddress: json.address }));
      } catch (error) {
        console.error(error);
      }
    };
    handler();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, [connected]);

  useEffect(() => {
    const connecterHandler = async () => {
      try {
        await connect({
          connector: new InjectedConnector(),
        });
        await switchNetwork({
          chainId: polygonMumbai.id || 80001,
        });
      } catch (error) {}
    };
    const fetchData = async () => {
      try {
        await connecterHandler();
        setConnected(true);
      } catch (error) {
        setConnected(false);
      }
    };
    fetchData();
  }, []);

  let app;

  if (
    state.loggedInAddress?.startsWith('0x') &&
    status === 'connected' &&
    !state.loading
  ) {
    app = (
      <Container mb="4" mt="20" maxWidth="6xl" width="full">
        <Flex>
          <Sidebar />
          {children}
        </Flex>
      </Container>
    );
  } else if (status === 'connected' && !state.loading) {
    app = <LoginPrompt signIn={signIn} />;
  } else if (status === 'disconnected') {
    app = <WalletNotConnected />;
  } else {
    app = <Loader />;
  }
  return (
    <>
      <Flex
        pos="fixed"
        w="full"
        zIndex="999"
        alignItems="center"
        justifyContent="space-between"
        px={4}
        py={2}
        top="0"
        bg="rgb(0,0,0,0.8)"
      >
        <Link href="/">
          <Image
            src="/logo_w_text.png"
            alt="Logo"
            width={140}
            mx="auto"
            mr={2}
          />
        </Link>

        <Flex alignItems="center">
          {chain && (
            <Text
              fontSize="sm"
              fontWeight="semibold"
              mr={4}
              display={{ base: 'none', md: 'block' }}
            >
              {chain.name}
            </Text>
          )}

          {status === 'connected' ? (
            //if connected check if logged in with ethereum or not
            state.loggedInAddress?.startsWith('0x') ? (
              //if logged in with ethereum then we show the logout button dropdown with wallet address in navbar
              <Menu>
                <MenuButton
                  as={Button}
                  variant="solid"
                  colorScheme="blue"
                  rounded="full"
                  mr={3}
                  _hover={{ cursor: 'pointer' }}
                  rightIcon={<AiOutlineCaretDown />}
                >
                  {address?.slice(0, 6)}....
                  {address?.slice(-6)}
                </MenuButton>
                <MenuList color="white">
                  <MenuItem _hover={{ cursor: 'pointer' }} onClick={logout}>
                    Logout
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              //if not logged in with ethereum then we show the standard diconnect wallet dropdown
              <Menu>
                <MenuButton
                  as={Button}
                  variant="solid"
                  rounded="full"
                  colorScheme="blue"
                  mr={3}
                  _hover={{ cursor: 'pointer' }}
                  rightIcon={<AiOutlineCaretDown />}
                >
                  {address?.slice(0, 6)}....{address?.slice(-6)}
                </MenuButton>
                <MenuList color="white">
                  <MenuItem
                    _hover={{ cursor: 'pointer' }}
                    onClick={() => disconnect()}
                  >
                    Disconnect Wallet
                  </MenuItem>
                </MenuList>
              </Menu>
            )
          ) : (
            //if not connected then show button to connect
            <Button
              onClick={async () => {
                try {
                  await connect({
                    connector: new InjectedConnector(),
                  });
                } catch (error) {
                  console.error(error);
                }
              }}
              variant="solid"
              colorScheme="blue"
              rounded="full"
              mr={3}
            >
              Connect Wallet <AiOutlineArrowRight className="ms-1" />
            </Button>
          )}
        </Flex>
      </Flex>
      <Box>{app}</Box>
    </>
  );
};

export default Layout;
