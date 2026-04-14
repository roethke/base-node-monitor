/**
 * Network configurations for Base Node Monitor
 */

const NETWORKS = {
  mainnet: {
    name: 'Base Mainnet',
    rpc_endpoints: [
      'https://mainnet.base.org',
      'https://developer-access-mainnet.base.org',
      'https://base.meowrpc.com',
      'https://base-mainnet.public.blastapi.io',
      'https://base.gateway.tenderly.co',
      'https://gateway.tenderly.co/public/base',
      'https://rpc.notadegen.com/base',
      'https://base.blockpi.network/v1/rpc/public',
      'https://1rpc.io/base',
      'https://base-pokt.nodies.app',
      'https://base-mainnet.diamondswap.org/rpc',
      'https://base.publicnode.com',
      'https://base.drpc.org',
      'https://endpoints.omniatech.io/v1/base/mainnet/public',
      'https://base-rpc.publicnode.com',
      'https://base.llamarpc.com',
      'https://api.zan.top/node/v1/base/public',
      'https://lb.drpc.org/ogrpc?network=base&dkey=Ak765fp4zUm6uVwKu4annC8M80dnCZkR7pAEsm6XXi_w',
      'https://eth.nownodes.io/base',
      'https://base-mainnet.rpc.extrnode.com',
      'https://go.getblock.io/5c55b5a613d541b29e91762dc19cb476',
      'https://base.api.onfinality.io/public',
      'https://base-mainnet.nodeconnect.org',
      'https://base-mainnet-public.unifra.io',
      'https://public.stackup.sh/api/v1/node/base-mainnet',
      'https://rpc.tornadoeth.cash/base',
      'https://base-mainnet.g.alchemy.com/v2/demo'
    ],
    admin_nodes: []
  },
  sepolia: {
    name: 'Base Sepolia',
    rpc_endpoints: [
      'https://sepolia.base.org',
      'https://base-sepolia.blockpi.network/v1/rpc/public',
      'https://base-sepolia-rpc.publicnode.com',
      'https://public.stackup.sh/api/v1/node/base-sepolia',
      'https://base-sepolia.gateway.tenderly.co',
      'https://gateway.tenderly.co/public/base-sepolia'
    ],
    admin_nodes: []
  }
};

module.exports = { NETWORKS };
