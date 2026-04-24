"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type MerchantModalType = "select" | "create" | null;

interface MerchantModalContextProps {
  modalType: MerchantModalType;
  openSelectMerchant: () => void;
  openCreateMerchant: () => void;
  closeModal: () => void;
}

const MerchantModalContext = createContext<MerchantModalContextProps | undefined>(undefined);

export const MerchantModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalType, setModalType] = useState<MerchantModalType>(null);

  const openSelectMerchant = () => setModalType("select");
  const openCreateMerchant = () => setModalType("create");
  const closeModal = () => setModalType(null);

  return (
    <MerchantModalContext.Provider value={{ modalType, openSelectMerchant, openCreateMerchant, closeModal }}>
      {children}
    </MerchantModalContext.Provider>
  );
};

export const useMerchantModal = () => {
  const context = useContext(MerchantModalContext);
  if (!context) {
    throw new Error("useMerchantModal must be used within a MerchantModalProvider");
  }
  return context;
};
