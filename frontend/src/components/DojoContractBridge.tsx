import { useEffect } from 'react';
import { useDojoSDK } from '@dojoengine/sdk/react';
import { setContractClient } from '../utils/contractBridge';

export function DojoContractBridge() {
  const { client } = useDojoSDK();
  useEffect(() => {
    setContractClient(client);
    return () => setContractClient(null);
  }, [client]);
  return null;
}
