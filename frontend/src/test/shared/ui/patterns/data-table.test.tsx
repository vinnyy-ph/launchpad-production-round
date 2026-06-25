import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { DataTable, type Column } from "@/shared/ui/patterns/data-table";
import { EmptyState } from "@/shared/ui/patterns/empty-state";

interface Row {
  id: string;
  name: string;
}

const columns: Column<Row>[] = [{ header: "Name", cell: (r) => r.name }];
const emptyState = <EmptyState icon={Inbox} title="No rows yet" />;

describe("DataTable", () => {
  it("renders the empty state when data is an empty array", () => {
    render(<DataTable columns={columns} data={[]} emptyState={emptyState} />);
    expect(screen.getByText("No rows yet")).toBeInTheDocument();
  });

  it("renders an error state with a working retry button", async () => {
    const onRetry = jest.fn();
    render(
      <DataTable
        columns={columns}
        data={undefined}
        error="Boom"
        onRetry={onRetry}
        emptyState={emptyState}
      />,
    );
    expect(screen.getByText("Boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders rows and fires onRowClick with the clicked row", async () => {
    const onRowClick = jest.fn();
    const data: Row[] = [
      { id: "1", name: "Ada" },
      { id: "2", name: "Lin" },
    ];
    render(
      <DataTable
        columns={columns}
        data={data}
        emptyState={emptyState}
        onRowClick={onRowClick}
        getRowId={(r) => r.id}
      />,
    );
    expect(screen.getByText("Ada")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Lin"));
    expect(onRowClick).toHaveBeenCalledWith({ id: "2", name: "Lin" });
  });

  it("shows skeletons (not the empty state) while loading", () => {
    render(
      <DataTable columns={columns} data={undefined} isLoading emptyState={emptyState} />,
    );
    expect(screen.queryByText("No rows yet")).not.toBeInTheDocument();
  });

  it("renders pagination controls and requests page changes", async () => {
    const onPageChange = jest.fn();
    render(
      <DataTable
        columns={columns}
        data={[{ id: "1", name: "Ada" }]}
        emptyState={emptyState}
        pagination={{ page: 1, totalPages: 2, onPageChange }}
      />,
    );

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("renders sortable headers and toggles sort direction", async () => {
    const onSortChange = jest.fn();
    render(
      <DataTable
        columns={[{ header: "Name", cell: (r: Row) => r.name, sortable: true, sortKey: "name" }]}
        data={[{ id: "1", name: "Ada" }]}
        emptyState={emptyState}
        sort={{ key: "name", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );

    const sortButton = screen.getByRole("button", { name: /sort by name descending/i });
    expect(screen.getByRole("columnheader", { name: /name/i })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await userEvent.click(sortButton);
    expect(onSortChange).toHaveBeenCalledWith({ key: "name", direction: "desc" });
  });
});
