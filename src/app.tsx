import * as React from "react";
import Header from "./components/Header/Header";
import ReactDOM from "react-dom";

const HelloWorld = () => {
  const [counter, setCounter] = React.useState<number>(0);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setCounter((state) => (state += 1));
    }, 1000);
    return () => {
      clearTimeout(timeout);
    };
  }, [counter]);
  return (
    <h1>
      hedd{counter} <Header />
    </h1>
  );
};

ReactDOM.render(<HelloWorld />, document.getElementById("root"));
