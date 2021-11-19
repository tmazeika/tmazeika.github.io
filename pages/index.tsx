import type { NextPage } from 'next';
import Layout from '../components/Layout';

const Home: NextPage = () => (
  <Layout>
    <h1 className="inline-block m-3 p-3 border-2 border-blue-500 text-2xl">Hello, world!</h1>
  </Layout>
);

export default Home;
