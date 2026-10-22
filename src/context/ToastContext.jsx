import React, { createContext, useContext, useState } from "react";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 9999 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast show align-items-center text-white ${
              toast.type === "success"
                ? "bg-dark"
                : toast.type === "error"
                ? "bg-danger"
                : "bg-secondary"
            } border-0 mb-2 shadow-lg`}
            role="alert"
            style={{ borderRadius: "12px", minWidth: "280px" }}
          >
            <div className="d-flex align-items-center p-3">
              <div className="toast-body flex-grow-1" style={{ fontSize: "14px", fontWeight: "500" }}>
                {toast.type === "success" && <i className="fa-solid fa-circle-check text-success me-2"></i>}
                {toast.type === "error" && <i className="fa-solid fa-circle-exclamation text-danger me-2"></i>}
                {toast.message}
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                onClick={() => removeToast(toast.id)}
              ></button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
