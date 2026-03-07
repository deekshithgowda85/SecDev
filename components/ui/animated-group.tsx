"use client";
import { motion } from "framer-motion";
import React from "react";

// Use a permissive variant shape so callers can pass any framer-motion variant object
// without hitting strict-typing issues on `type: 'spring'` etc.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyVariants = Record<string, any>;

interface AnimatedGroupProps {
  children: React.ReactNode;
  className?: string;
  variants?: {
    container?: AnyVariants;
    item?: AnyVariants;
  };
}

const defaultContainer: AnyVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const defaultItem: AnyVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.3, duration: 0.8 } },
};

export function AnimatedGroup({ children, className, variants }: AnimatedGroupProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerVariants = (variants?.container ?? defaultContainer) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemVariants = (variants?.item ?? defaultItem) as any;
  const items = React.Children.toArray(children);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
    >
      {items.map((child, i) => (
        <motion.div key={i} variants={itemVariants} style={{ display: "contents" }}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
