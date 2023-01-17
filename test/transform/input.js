// noinspection ES6UnusedImports
import { ESXSlot, ESXTag, ESX } from "../../dist/esx.js";

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
      {...args}
    </>
  );
}

export const component = props => <MyComponent a="a" {...props} />;
