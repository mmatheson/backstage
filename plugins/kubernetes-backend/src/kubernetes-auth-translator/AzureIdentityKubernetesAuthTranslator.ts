/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { KubernetesAuthTranslator } from './types';
import { AzureClusterDetails } from '../types/types';
import {
  AccessToken,
  DefaultAzureCredential,
  TokenCredential,
} from '@azure/identity';

const aksScope = '6dae42f8-4368-4678-94ff-3960e28e3630/.default'; // This scope is the same for all Azure Managed Kubernetes

export class AzureIdentityKubernetesAuthTranslator
  implements KubernetesAuthTranslator
{
  private accessToken: AccessToken | null = null;

  constructor(
    private readonly tokenCredential: TokenCredential = new DefaultAzureCredential(),
  ) {}

  async decorateClusterDetailsWithAuth(
    clusterDetails: AzureClusterDetails,
  ): Promise<AzureClusterDetails> {
    const clusterDetailsWithAuthToken: AzureClusterDetails = Object.assign(
      {},
      clusterDetails,
    );

    if (this.tokenExpired()) {
      this.accessToken = await this.tokenCredential.getToken(aksScope);

      if (!this.accessToken) {
        throw new Error('Unable to retrieve Azure token');
      }
    }

    clusterDetailsWithAuthToken.serviceAccountToken = this.accessToken!.token;
    return clusterDetailsWithAuthToken;
  }

  private tokenExpired(): boolean {
    if (!this.accessToken) return true;

    // Set tokens to expire 15 minutes before its actual expiry time
    const expiresOn = this.accessToken.expiresOnTimestamp - 15 * 60 * 1000;
    return Date.now() >= expiresOn;
  }
}
