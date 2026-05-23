import React from 'react';
import { motion } from 'framer-motion';
import styles from './PageTransition.module.css';
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={styles.container}
    >
      {children}
    </motion.div>
  );
};
