import { render, fireEvent } from "@testing-library/react";
import TabGroup from "./TabGroup";

describe("TabGroup component", () => {
  const onChange = jest.fn();
  const defaultProps = {
    options: ["option1", "option2", "option3"],
    value: "option1",
    onChange,
    label: "Test Label",
  };

  beforeEach(() => {
    onChange.mockClear();
  });

  it("renders label", () => {
    const { getByText } = render(<TabGroup {...defaultProps} />);
    expect(getByText("Test Label")).toBeInTheDocument();
  });

  it("renders all options", () => {
    const { getAllByRole } = render(<TabGroup {...defaultProps} />);
    expect(getAllByRole("tab")).toHaveLength(defaultProps.options.length);
  });

  it("renders active tab correctly", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />);
    const activeTab = getByRole("tab", { name: "Option1" });
    expect(activeTab).toHaveClass("tab-active");
    expect(activeTab).toHaveAttribute("aria-selected", "true");
  });

  it("sets aria-selected false on inactive tabs", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />);
    expect(getByRole("tab", { name: "Option2" })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange when tab is clicked", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />);
    const tab = getByRole("tab", { name: "Option2" });
    fireEvent.click(tab);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("renders options with correct capitalisation", () => {
    const { getByText } = render(<TabGroup {...defaultProps} />);
    expect(getByText("Option1")).toBeInTheDocument();
  });

  it("moves to the next tab on ArrowRight", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />);
    const activeTab = getByRole("tab", { name: "Option1" });
    fireEvent.keyDown(activeTab, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("option2");
  });

  it("wraps to the first tab on ArrowRight from the last tab", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} value="option3" />);
    const lastTab = getByRole("tab", { name: "Option3" });
    fireEvent.keyDown(lastTab, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("option1");
  });

  it("moves to the previous tab on ArrowLeft", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} value="option2" />);
    const tab = getByRole("tab", { name: "Option2" });
    fireEvent.keyDown(tab, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith("option1");
  });

  it("wraps to the last tab on ArrowLeft from the first tab", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />);
    const firstTab = getByRole("tab", { name: "Option1" });
    fireEvent.keyDown(firstTab, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith("option3");
  });

  it("moves to the first tab on Home", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} value="option3" />);
    const tab = getByRole("tab", { name: "Option3" });
    fireEvent.keyDown(tab, { key: "Home" });
    expect(onChange).toHaveBeenCalledWith("option1");
  });

  it("moves to the last tab on End", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />);
    const tab = getByRole("tab", { name: "Option1" });
    fireEvent.keyDown(tab, { key: "End" });
    expect(onChange).toHaveBeenCalledWith("option3");
  });

  it("sets tabIndex 0 on the active tab and -1 on inactive tabs", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />);
    expect(getByRole("tab", { name: "Option1" })).toHaveAttribute("tabIndex", "0");
    expect(getByRole("tab", { name: "Option2" })).toHaveAttribute("tabIndex", "-1");
    expect(getByRole("tab", { name: "Option3" })).toHaveAttribute("tabIndex", "-1");
  });

  it("links the tablist to its label via aria-labelledby", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />);
    const tablist = getByRole("tablist");
    expect(tablist).toHaveAttribute("aria-labelledby");
  });

  it("renders an associated tabpanel", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />);
    expect(getByRole("tabpanel")).toBeInTheDocument();
  });

  it("does not call onChange for unrelated keys", () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />);
    const tab = getByRole("tab", { name: "Option1" });
    fireEvent.keyDown(tab, { key: "a" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
