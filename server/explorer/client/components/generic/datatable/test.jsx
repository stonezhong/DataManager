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
    };

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

    generate_rows = count => {
        const rows = [];
        for (var i = 0; i <=count; i ++) {
            const v = Math.random()*100;
            const row = {
                symbol: this.symbol_at(i),
                high:   parseFloat((v * 1.1).toFixed(2)),
                low:    parseFloat((v * 0.9).toFixed(2)),
                open:   parseFloat(v.toFixed(2)),
                close:  parseFloat((v*1.02).toFixed(2)),
            };
            rows.push(row);
        }
        return rows;
    };

    state = {
        rows: this.generate_rows(200),
    };

    get_page = (offset, limit) => {
        return {
            count: this.state.rows.length,
            results: this.state.rows.slice(offset, offset+limit)
        }
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
                    page_size={15}
                    get_page = {this.get_page}
                    fast_step_count={5}
                    ref={this.testDataTableRef}
                />
            </Container>
        );
    }
}
