// Mirrors the server's serializers (server/src/services/serialize.ts). Money is in cents.

export type AuctionStatus = 'scheduled' | 'active' | 'sold' | 'no_bids' | 'reserve_not_met' | 'cancelled' | 'rejected';
export type OrderStatus = 'awaiting_payment' | 'paid' | 'shipped' | 'completed' | 'unpaid' | 'disputed' | 'refunded';
export type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'for_parts';

export interface User {
  id: string;
  displayName: string;
  city: string | null;
  rating: number | null;
  ratingCount: number;
  salesCount: number;
  purchasesCount: number;
  memberSince: number;
}

export interface Me extends User {
  email: string;
  unpaidStrikes: number;
  unreadNotifications: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface AuctionSummary {
  id: string;
  title: string;
  image: string | null;
  categoryId: string;
  condition: Condition;
  location: string | null;
  currency: string;
  currentPrice: number;
  startingPrice: number;
  buyNowPrice: number | null;
  buyNowAvailable: boolean;
  shippingCost: number;
  bidCount: number;
  watchCount: number;
  hasReserve: boolean;
  reserveMet: boolean | null;
  startAt: number;
  endAt: number;
  status: AuctionStatus;
  sellerId: string;
}

export interface AuctionDetail extends AuctionSummary {
  description: string;
  images: string[];
  viewCount: number;
  seq: number;
  rejectionReason: string | null;
  minNextBid: number;
}

export interface BidEntry {
  bidder: string;
  amount: number;
  isProxy: boolean;
  createdAt: number;
}

export interface Question {
  id: string;
  asker: string;
  question: string;
  answer: string | null;
  createdAt: number;
  answeredAt: number | null;
}

export interface Viewer {
  isSeller: boolean;
  isLeading: boolean;
  myMax: number | null;
  watching: boolean;
  orderId: string | null;
}

export interface AuctionPage {
  auction: AuctionDetail;
  seller: User;
  bids: BidEntry[];
  questions: Question[];
  viewer: Viewer | null;
  fees: { buyerPremiumBps: number; vatBps: number };
}

export interface AuctionLive {
  auctionId: string;
  currentPrice: number;
  bidCount: number;
  endAt: number;
  status: AuctionStatus;
  buyNowAvailable: boolean;
  reserveMet: boolean | null;
  minNextBid: number;
  seq: number;
}

export interface BidResponse {
  auctionId: string;
  currentPrice: number;
  bidCount: number;
  endAt: number;
  winning: boolean;
  yourMax: number;
  extended: boolean;
  reserveMet: boolean | null;
  minNextBid: number;
}

export interface Order {
  id: string;
  auctionId: string;
  buyerId: string;
  sellerId: string;
  currency: string;
  hammerPrice: number;
  buyerFee: number;
  tax: number;
  shippingCost: number;
  total: number;
  sellerFee: number;
  sellerPayout: number;
  status: OrderStatus;
  paymentDueAt: number;
  cardLast4: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  shippingAddress: string | null;
  disputeReason: string | null;
  paidAt: number | null;
  shippedAt: number | null;
  completedAt: number | null;
  createdAt: number;
}

export interface OrderListItem extends Order {
  title: string;
  image: string | null;
  role: 'buyer' | 'seller';
}

export interface OrderPage {
  order: Order;
  auction: AuctionSummary;
  role: 'buyer' | 'seller';
  counterpart: User;
  reviewed: boolean;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  auctionId: string | null;
  orderId: string | null;
  read: boolean;
  createdAt: number;
}

export interface Quote {
  hammerPrice: number;
  buyerFee: number;
  tax: number;
  shippingCost: number;
  total: number;
}
