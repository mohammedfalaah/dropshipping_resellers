import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { productsApi } from "../services/api";
import { categories as initialCategories } from "../data/productsData";

const ProductContext = createContext();

export const ProductProvider = ({ children }) => {
  const normalizeProduct = (p) => {
    const rawCategory = p.category || (p.categorySlug ? p.categorySlug : "Gadgets");
    const categorySlug = (p.categorySlug || rawCategory || "gadgets").toLowerCase().trim();
    return {
      ...p,
      id: p._id || p.id,
      _id: p._id || p.id,
      name: p.name,
      slug: p.slug,
      category: rawCategory,
      categorySlug: categorySlug,
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
      colors: Array.isArray(p.colors) && p.colors.length > 0
        ? p.colors
        : Array.isArray(p.variants)
        ? Array.from(new Set(p.variants.map((v) => v.color).filter(Boolean)))
        : [],
      sizes: Array.isArray(p.sizes) && p.sizes.length > 0
        ? p.sizes
        : Array.isArray(p.variants)
        ? Array.from(new Set(p.variants.map((v) => v.size).filter(Boolean)))
        : [],
      variants: Array.isArray(p.variants) ? p.variants : [],
      additionalInfo: p.additionalInfo || {},
    };
  };

  const normalizeCategory = (c, idx) => {
    const slug = (c.slug || c.name || "").toLowerCase().trim();
    const fallback = initialCategories.find(
      (ic) => ic.slug.toLowerCase() === slug || ic.name.toLowerCase() === (c.name || "").toLowerCase()
    );
    return {
      ...c,
      id: c.id || c._id || `cat-${slug || idx}`,
      _id: c._id || c.id || `cat-${slug || idx}`,
      slug: slug || fallback?.slug || "gadgets",
      name: c.name || fallback?.name || "Category",
      image: c.image || fallback?.image || `/images/category-${slug || "gadgets"}.jpg`,
      count: c.productCount ?? c.count ?? fallback?.count ?? 0,
      description: c.description || fallback?.description || "",
    };
  };

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(() => initialCategories.map(normalizeCategory));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel fetch products and categories
      const [prodRes, catRes] = await Promise.allSettled([
        productsApi.getAll({ limit: 100 }),
        productsApi.getCategories(),
      ]);

      if (prodRes.status === "fulfilled") {
        const rawProducts =
          prodRes.value?.data?.products ||
          prodRes.value?.products ||
          (Array.isArray(prodRes.value) ? prodRes.value : []);
        if (Array.isArray(rawProducts)) {
          const normalizedDbProducts = rawProducts.map(normalizeProduct);
          setProducts(normalizedDbProducts);
        } else {
          setProducts([]);
        }
      } else {
        console.warn("Backend products API failed or unreachable:", prodRes.reason);
        setProducts([]);
      }

      if (catRes.status === "fulfilled") {
        const rawCategories =
          catRes.value?.data?.categories ||
          catRes.value?.categories ||
          (Array.isArray(catRes.value) ? catRes.value : []);
        if (Array.isArray(rawCategories) && rawCategories.length > 0) {
          setCategories(rawCategories.map(normalizeCategory));
        } else {
          setCategories(initialCategories.map(normalizeCategory));
        }
      } else {
        console.warn("Backend categories API failed or unreachable, keeping fallback categories:", catRes.reason);
        setCategories((prev) => (prev && prev.length > 0 ? prev : initialCategories.map(normalizeCategory)));
      }

      setError(null);
    } catch (err) {
      console.warn("Could not fetch live products from API:", err.message);
      setError(err.message);
      setProducts([]);
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
