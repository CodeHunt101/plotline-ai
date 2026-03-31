import { render, screen } from "@testing-library/react";
import MovieNightForm from "./page";
import { metadata } from "./page";

jest.mock("@/components/features/ParticipantsSetup", () =>
  jest.fn(() => <div data-testid="participants-setup" />)
);

describe("MovieNightForm Component", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it(`renders ParticipantsSetup when initialisation is successful`, async () => {
    render(await MovieNightForm());

    // Assert that ParticipantsSetup is rendered
    expect(screen.getByTestId("participants-setup")).toBeInTheDocument();
  });

  it("exports indexable route metadata", () => {
    expect(metadata.title).toBeTruthy();
    expect(metadata.description).toBeTruthy();
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("renders homepage structured data", async () => {
    const { container } = render(await MovieNightForm());

    const structuredData = container.querySelector('script[type="application/ld+json"]');

    expect(structuredData).toBeInTheDocument();
    expect(structuredData?.textContent).toContain('"@type":"WebApplication"');
  });
});
