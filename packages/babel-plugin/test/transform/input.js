const div = <div />;

const div2 = (
  <div id="a" title={"b"}>
    <p>c{div}</p>
    {}
    asdasd
    fthertghfg
    {div}
    {`some${'const'}${`literal!${1}`}`}
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
