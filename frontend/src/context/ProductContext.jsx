import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { productsApi } from "../services/api";
import { products as initialProducts, categories as initialCategories } from "../data/productsData";

const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const normalizeProduct = (p) => ({
    ...p,
    id: p._id || p.id,
    _id: p._id || p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    categorySlug: p.categorySlug || (p.category ? p.category.toLowerCase() : "gadgets"),
    price: Number(p.price ?? p.resellerPrice ?? p.regularPrice ?? 0),
    originalPrice: Number(p.originalPrice ?? p.regularPrice ?? p.price ?? 0),
    resellerPrice: Number(p.resellerPrice ?? p.price ?? 0),
    regularPrice: Number(p.regularPrice ?? p.originalPrice ?? 0),
    image: p.image || p.mainImage || "/images/product-earbuds.jpg",
    mainImage: p.mainImage || p.image || "/images/product-earbuds.jpg",
    thumbnails: (p.gallery && p.gallery.length) ? p.gallery : (p.thumbnails && p.thumbnails.length ? p.thumbnails : [p.image || p.mainImage || "/images/product-earbuds.jpg"]),
    badge: p.badge || (p.isFeatured ? "Featured" : p.isTrending ? "Trending" : ""),
    rating: p.rating || 5,
    ratingCount: p.ratingCount || 48,
    inStock: p.inStock !== undefined ? p.inStock : (p.stockQuantity !== undefined ? p.stockQuantity > 0 : true),
    stockCount: p.stockQuantity !== undefined ? p.stockQuantity : (p.stockCount || 100),
    sku: p.sku || "",
    shortDescription: p.shortDescription || p.description || "",
    description: p.description || "",
    additionalInfo: p.additionalInfo || {},
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel fetch products and categories
      const [prodRes, catRes] = await Promise.allSettled([
        productsApi.getAll({ limit: 100 }),
        productsApi.getCategories(),
      ]);

      if (prodRes.status === "fulfilled") {
        const rawProducts = prodRes.value?.data?.products || prodRes.value?.products || [];
        if (Array.isArray(rawProducts) && rawProducts.length > 0) {
          const normalizedDbProducts = rawProducts.map(normalizeProduct);
          setProducts(normalizedDbProducts);
        } else {
          // Fallback to initialProducts if backend has no products yet
          setProducts(initialProducts.map(normalizeProduct));
        }
      }

      if (catRes.status === "fulfilled") {
        const rawCategories = catRes.value?.data?.categories || catRes.value?.categories || [];
        if (Array.isArray(rawCategories) && rawCategories.length > 0) {
          setCategories(rawCategories);
        }
      }

      setError(null);
    } catch (err) {
      console.warn("Could not fetch live products from API:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const getProductBySlug = (slug) => {
    return products.find((p) => p.slug === slug);
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        loading,
        error,
        refreshProducts: fetchProducts,
        getProductBySlug,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
};
