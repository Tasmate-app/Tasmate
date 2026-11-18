import type { ElementType, ReactNode } from 'react';

interface CardProps {
  title?: string;
  id?: string;
  className?: string;
  headingLevel?: 2 | 3 | 4;
  children: ReactNode;
}

/** 共通カード */
export function Card({
  title,
  id,
  className,
  headingLevel = 2,
  children,
}: CardProps) {
  const Heading: ElementType = `h${headingLevel}`;
  return (
    <section className={`card${className === undefined ? '' : ` ${className}`}`} id={id}>
      {title !== undefined && <Heading>{title}</Heading>}
      {children}
    </section>
  );
}
