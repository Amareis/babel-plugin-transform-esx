// noinspection ES6UnusedImports
import { ESXSlot, ESXAttribute, ESXTag, ESXInstance } from "../../dist/esx.js";

const div = <div />;

const div2 = (
  <div id="a" title={"b"}>
    <p>c</p>
    {}
    asdasd
    fthertghfg
    {div}
  </div>
);

function MyComponent(...args) {
  return (
    <>
      {"A"},{"B"}
      {div2}
      {args.map(a => <div>{a}</div>)}
    </>
  );
}

export const component = props => <MyComponent a="a" {...props} />;
