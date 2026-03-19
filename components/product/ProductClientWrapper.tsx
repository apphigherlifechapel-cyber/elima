"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ProductClientWrapperProps {
  children: ReactNode;
}

export function ProductClientWrapper({ children }: ProductClientWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
