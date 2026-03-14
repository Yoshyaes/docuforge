import { CSSProperties, ReactNode } from "react";

export interface ListProps {
  /** Items to list */
  items: (string | ReactNode)[];
  /** Specify if the list is ordered or unordered. Defaults to false (unordered) */
  ordered?: boolean;
  /** Additional inline styles applied to the list element */
  style?: CSSProperties;
  /**Custom styling */
  className?: string;
}

export function List({
  items,
  ordered = false,
  style,
  className,
}: ListProps) {
  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag className={className} style={{ fontSize: "12px", lineHeight: 1.6, color: "#1a1a1a", paddingLeft: "20px", margin: 0, ...style }}>
      {
        items.map((item, i) => (
          <li key={`item-${i}`}>{item}</li>
        ))
      }
    </Tag >
  );
}
