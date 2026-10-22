import type { RetailerId } from '../types';

export interface Retailer {
  id: RetailerId;
  name: string;
  /** Store home page. Used only as a "visit store" link — never presented as a product page. */
  homepage: string;
  /** How Forma is connected to this retailer in this build. */
  connection: 'none';
}

// No retailer feed or API is connected in this build. Listings for these stores in the sample
// catalog are illustrative placeholders; see src/catalog/sampleCatalog.ts and README.
export const RETAILERS: Record<RetailerId, Retailer> = {
  'ikea-il': { id: 'ikea-il', name: 'IKEA Israel', homepage: 'https://www.ikea.co.il', connection: 'none' },
  ace: { id: 'ace', name: 'ACE', homepage: 'https://www.ace.co.il', connection: 'none' },
  beitili: { id: 'beitili', name: 'Beitili', homepage: 'https://www.beitili.co.il', connection: 'none' },
  floralis: { id: 'floralis', name: 'Floralis', homepage: 'https://www.floralis.co.il', connection: 'none' },
};

export const RETAILER_IDS = Object.keys(RETAILERS) as RetailerId[];
