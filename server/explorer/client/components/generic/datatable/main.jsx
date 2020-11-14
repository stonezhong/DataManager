import React from 'react'

import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'

import * as Icon from 'react-bootstrap-icons'

/*********************************************************************************
 * Purpose: Generic Data Table
 *
 * Props
 *     columns    : object, key is the unique column id, value is a dict.
 *                  value.display: a string or a function, represent the header
 *                  value.render_data: an optional function, if present, it will
 *                  be called to render the data, this function is like
 *                  render_data(row), it either return a string or a component
 *
 *     id_column  : the primary key column, the value of this column MUST be unique
 *
 *     get_page   : a function that will return the rows in current page
 *                  proto: get_page(page_number)
 *                  return example:
 *                  {
 *                      page_count: 123,
 *                      page: 22,
 *                      rows: [...]
 *                  }
 *                  Normally, page should be the same as page_number. But when the data
 *                  size changes and page exceeed the last page, return page could be different
 *                  than page_number.
 *
 *                  row can have extra attributes not in columns, but might be needed
 *                  for the render_data function.
 *
 *     fast_step_count  : for fast-forward or fast-backward, how many pages to go
 *
 *     all props table supports, see https://react-bootstrap.github.io/components/table/
 *     we will pass through these props
 */
export class DataTable extends React.Component {
    state = {
        page: 0,            // current page
        page_count: 0,      // total number of pages
        rows: [],           // rows in current page
    };

    get_table_props() {
        const table_props = {};
        _.forEach([
                'bordered', 'borderless', 'hover', 'responsive',
                'size', 'striped', 'variant'
            ], prop_id => {
                if (prop_id in this.props) {
                    table_props[prop_id] = this.props[prop_id];
                }
            }
        );
        return table_props;
    }

    componentDidMount() {
        Promise.resolve(this.props.get_page(this.state.page)).then(result => {
            // result.page MUST be 0
            this.setState({
                page_count: result.page_count,
                rows: _.cloneDeep(result.rows)
            });
        });
    }

    render_column_header = (column) => {
        if (_.isFunction(column.display)) {
            return column.display();
        }
        return column.display;
    };

    render_data = (row, column_id, column) => {
        const render_function = column.render_data;
        if (_.isUndefined(render_function)) {
            return row[column_id];
        }

        return render_function(row);
    };

    nav_to = page => {
        Promise.resolve(this.props.get_page(page)).then(result => {
            this.setState({
                page_count: result.page_count,
                rows: _.cloneDeep(result.rows),
                page: result.page,
            });
        });
    };

    nav_forward = () => {
        const new_page = this.state.page + 1;
        this.nav_to(new_page);
    };

    nav_fforward = () => {
        const new_page = this.state.page + this.props.fast_step_count;
        this.nav_to(new_page);
    };

    nav_backward = () => {
        const new_page = Math.max(0, this.state.page - 1);
        this.nav_to(new_page);
    };

    nav_fbackward = () => {
        const new_page = Math.max(0, this.state.page - this.props.fast_step_count);
        this.nav_to(new_page);
    };

    nav_first = () => {
        this.nav_to(0);
    };

    nav_last = () => {
        this.nav_to(this.state.page_count - 1);
    };

    render() {
        return (
            <div>
                <ButtonGroup className="mb-2">
                    <Button
                        variant="secondary"
                        onClick={this.nav_first}
                    >
                        <Icon.ChevronBarLeft />
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={this.nav_fbackward}
                    >
                        <Icon.ChevronDoubleLeft />
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={this.nav_backward}
                    >
                        <Icon.ChevronLeft />
                    </Button>
                    <Button variant="secondary" disabled>
                        {this.state.page + 1} /
                        {this.state.page_count}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={this.nav_forward}
                    >
                        <Icon.ChevronRight />
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={this.nav_fforward}
                    >
                        <Icon.ChevronDoubleRight />
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={this.nav_last}
                    >
                        <Icon.ChevronBarRight />
                    </Button>
                </ButtonGroup>

                <Table {...this.get_table_props()}>
                    <thead className="thead-dark">
                        <tr>
                            {
                                _.map(
                                    this.props.columns,
                                    (column, column_id) =>
                                    <th key={column_id} data-rolw={column_id}>
                                        {this.render_column_header(column)}
                                    </th>
                                )
                            }
                        </tr>
                    </thead>
                    <tbody>
                        {
                            _.map(this.state.rows, row =>
                                <tr key={row[this.props.id_column]}>
                                    {
                                        _.map(
                                            this.props.columns,
                                            (column, column_id) =>
                                                <td key={column_id} data-rolw={column_id}>
                                                    { this.render_data(row, column_id, column) }
                                                </td>
                                        )
                                    }
                                </tr>
                            )
                        }
                    </tbody>
                </Table>
            </div>
        )
    }
}

