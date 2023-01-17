const div = <div />;

const div2 = (
  <div a="a" b={"b"}>
    <p>c</p>
    {}
    asdasd
    fthertghfg
  </div>
);

function MyComponent(...args) {
  return (
    <>
      {"A"},{"B"}
    </>
  );
}

const component = <MyComponent a="a" {...props} />;
