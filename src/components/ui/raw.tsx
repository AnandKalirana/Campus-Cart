import { Fragment } from "react";

/** Renders slangy labels like SELL_NOW exactly as designed, while screen readers hear "SELL NOW". */
export function Raw({ children }: { children: string }) {
  const parts = children.split("_");
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && <><span aria-hidden>_</span><span className="sr-only"> </span></>}
        </Fragment>
      ))}
    </>
  );
}
