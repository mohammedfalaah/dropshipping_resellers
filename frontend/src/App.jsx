import React, { Suspense, lazy } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import BackToTop from "./components/BackToTop";
import { useScrollAnimation } from "./hooks/useScrollAnimation";

// Lightweight, smooth loading spinner fallback
const PageLoading = () => (
  <div className="d-flex justify-content-center align-items-center py-5 my-5" style={{ minHeight: "50vh" }}>
    <div className="spinner-border text-dark" role="status" style={{ width: "2.2rem", height: "2.2rem" }}>
      <span className="visually-hidden">Loading page...</span>
    </div>
  </div>
);

// Code-split Storefront Pages (Loaded on-demand for maximum performance)
const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderReceived = lazy(() => import("./pages/OrderReceived"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Faqs = lazy(() => import("./pages/Faqs"));
const Testimonials = lazy(() => import("./pages/Testimonials"));
const AccountDashboard = lazy(() => import("./pages/AccountDashboard"));
const Login = lazy(() => import("./pages/Login"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const DeliveryPolicy = lazy(() => import("./pages/DeliveryPolicy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Code-split Admin Panel Module (Completely isolated from storefront visitors)
import AdminRouteGuard from "./admin/AdminRouteGuard";
import AdminLayout from "./admin/AdminLayout";
const AdminLogin = lazy(() => import("./admin/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard"));
const Resellers = lazy(() => import("./admin/pages/Resellers"));
const ResellerApplications = lazy(() => import("./admin/pages/ResellerApplications"));
const Products = lazy(() => import("./admin/pages/Products"));
const Categories = lazy(() => import("./admin/pages/Categories"));
const Orders = lazy(() => import("./admin/pages/Orders"));
const CodPending = lazy(() => import("./admin/pages/CodPending"));
const Payments = lazy(() => import("./admin/pages/Payments"));
const ResellerBalances = lazy(() => import("./admin/pages/ResellerBalances"));
const BalanceSheet = lazy(() => import("./admin/pages/BalanceSheet"));
const Reports = lazy(() => import("./admin/pages/Reports"));
const Settings = lazy(() => import("./admin/pages/Settings"));

export default function App() {
  useScrollAnimation();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  if (isAdminRoute) {
    return (
      <div className="admin-root-container">
        <ScrollToTop />
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminRouteGuard>
                  <AdminLayout />
                </AdminRouteGuard>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="resellers" element={<Resellers />} />
              <Route path="applications" element={<ResellerApplications />} />
              <Route path="products" element={<Products />} />
              <Route path="categories" element={<Categories />} />
              <Route path="orders" element={<Orders />} />
              <Route path="cod-pending" element={<CodPending />} />
              <Route path="payments" element={<Payments />} />
              <Route path="balances" element={<ResellerBalances />} />
              <Route path="balance-sheet" element={<BalanceSheet />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
    );
  }

  return (
    <div className="site-wrapper d-flex flex-column min-vh-100">
      <ScrollToTop />
      <Header />
      <main className="flex-grow-1">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-received" element={<OrderReceived />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faqs" element={<Faqs />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/account" element={<AccountDashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/delivery-policy" element={<DeliveryPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/return-policy" element={<RefundPolicy />} />
            <Route path="/replacement-policy" element={<RefundPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
