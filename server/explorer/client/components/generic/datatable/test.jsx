import React from 'react'

import Container from 'react-bootstrap/Container'
import {DataTable} from './main.jsx'

export class TestDataTable extends React.Component {
    testDataTableRef = React.createRef();

    render_symbol = row => {
        return <b>{row.symbol}</b>;
    };

    columns = {
        symbol: {display: "Stock Symbol", render_data: this.render_symbol},
        high:   {display: "High"},
        low:    {display: "Low"},
        open:   {display: "Open"},
        close:  {display: "Close"},
    }

    symbol_at = idx => {
        var out = [];
        var v = idx;
        for (var i = 0; i < 4; i++) {
            const chCode = v % 26;
            out.push(String.fromCharCode(65+chCode));
            v = (v-chCode) / 26;
        }
        return _.reverse(out).join('');
    };

    get_page = page_number => {
        const rows = [];
        const page_count = 20;
        if (page_number < 0) {
            throw `page_number is negative: ${page_number}`;
        }
        const effective_page_number = Math.min(page_count-1, page_number);

        for (var i = effective_page_number*100; i < effective_page_number*100 + 20; i ++) {
            const row = {
                symbol: this.symbol_at(i),
                high: i + 100,
                low: i + 99,
                open: i + 99.1,
                close: i + 99.2
            };
            rows.push(row);
        }
        return {
            page_count: page_count,
            rows: rows,
            page: effective_page_number
        };
    };



    render() {
        return (
            <Container fluid>
                <h2>Test DataTable</h2>
                <DataTable
                    hover
                    size="sm"
                    bordered
                    columns = {this.columns}
                    id_column = "symbol"
                    get_page = {this.get_page}
                    render_data = {this.render_data}
                    fast_step_count={5}
                    ref={this.testDataTableRef}
                />
            </Container>
        );
    }
}
