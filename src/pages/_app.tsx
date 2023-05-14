import { ChakraProvider } from '@chakra-ui/react';
import { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from 'react-query';
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import { polygonMumbai } from 'wagmi/chains';
import '../styles/globals.css';
// import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';
import Layout from '../../components/Layout';
import { NotificationProvider } from '../../context/NotificationContext';
import theme from '../../theme';
const { provider } = configureChains([polygonMumbai], [publicProvider()]);
// pages/_app.js
import { Inter } from 'next/font/google';

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ['latin'] });
const client = createClient({
  autoConnect: false,
  provider,
});

const queryClient = new QueryClient();
export default function App({ Component, pageProps }) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('chakra-ui-color-mode', 'dark');
  }

  return (
    <WagmiConfig client={client}>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <NotificationProvider>
            <main className={inter.className}>
              <Layout>
                <Component {...pageProps} />
              </Layout>
            </main>
          </NotificationProvider>
        </ChakraProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
