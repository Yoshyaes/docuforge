import React, { ReactNode, CSSProperties } from "react";

export interface ListProps {
  /** Items to list */
  items: (string | ReactNode)[];
  /** Specify if the list is ordered or unordered. Defaults to false (unordered) */
  ordered?: boolean;
  /** Additional inline styles applied to the list element */
  style?: CSSProperties;
}

export function List({
  items,
  ordered = false,
  style,
}: ListProps) {
  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag style={style}>
      {items.map((item, i) => (
        <li key={`item-${i}`}>{item}</li>
      ))}
    </Tag>
  );
}
