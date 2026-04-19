export type UserSession = {
  user_id: number;
  username: string;
  email: string;
  role: string;
  tenant_id: number | null;
  guild_id: number | null;
};

export type Listing = {
  id: number;
  tenant_id: number;
  guild_id: number;
  seller_user_id: number;
  title: string;
  description: string;
  mode: string;
  visibility: string;
  status: string;
  currency_id?: number | null;
  start_price?: string | null;
  buyout_price?: string | null;
  bid_count: number;
  top_bid_amount?: string | null;
  matched_buyer_user_id?: number | null;
  created_at?: string;
};

export type ListingBid = {
  id: number;
  bidder_user_id: number;
  bidder_guild_id?: number | null;
  currency_id: number;
  amount: string;
  status: string;
  placed_at: string;
};
