// noinspection ES6UnusedImports
import { ESXSlot, ESXAttribute, ESXTag, ESXInstance } from "../../dist/esx.js";
const div = new ESXInstance(new ESXTag(new ESXSlot("div"), [], []), []);
const div2 = new ESXInstance(
  new ESXTag(
    new ESXSlot("div"),
    [
      new ESXAttribute("id", new ESXSlot("a")),
      new ESXAttribute("title", new ESXSlot("b")),
    ],
    [
      new ESXTag(new ESXSlot("p"), [], [new ESXSlot("c")]),
      new ESXSlot("\n    asdasd\n    fthertghfg\n    "),
      new ESXSlot(div),
    ]
  ),
  []
);
function MyComponent(...args) {
  return new ESXInstance(
    new ESXTag(
      null,
      [],
      [
        new ESXSlot("A"),
        new ESXSlot(","),
        new ESXSlot("B"),
        new ESXSlot(div2),
        new ESXSlot(
          args.map(
            (a) =>
              new ESXInstance(
                new ESXTag(new ESXSlot("div"), [], [new ESXSlot(a)]),
                []
              )
          )
        ),
      ]
    ),
    []
  );
}
export const component = (props) =>
  new ESXInstance(
    new ESXTag(
      new ESXSlot(MyComponent),
      [
        new ESXAttribute("a", new ESXSlot("a")),
        new ESXAttribute(null, new ESXSlot(props)),
      ],
      []
    ),
    []
  );
