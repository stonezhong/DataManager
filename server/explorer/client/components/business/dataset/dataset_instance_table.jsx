import React from 'react'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'

import * as Icon from 'react-bootstrap-icons'
import {DataTable} from '/components/generic/datatable/main.jsx'
import {SimpleDialogBox} from '/components/generic/dialogbox/simple.jsx'

import './dataset.scss'

/*********************************************************************************
 * Purpose: Show list of dataset instances
 * TODO: pagination
 *
 * Props
 *     dataset               : the dataset object
 *     dataset_instances     : a list of dataset instances
 *
 */
export class DatasetInstanceTable extends React.Component {
    theLoaderViewerRef  = React.createRef();
    theDataTableRef     = React.createRef();

    render_locations = dataset_instance => (
        <Table size="sm" borderless className="c-location-table">
            <tbody>
                {dataset_instance.locations.map((location)=>{
                    return (
                        <tr key={location.offset}>
                            <td><small><code>{location.type}</code></small></td>
                            <td><small><code>{location.location}</code></small></td>
                            <td><small><code>{location.size}</code></small></td>
                        </tr>
                    )
                })}
            </tbody>
        </Table>
    );

    render_loader = dataset_instance => (
        dataset_instance.loader && <Button
            variant="secondary"
            size="sm"
            variant="secondary"
            onClick={event => {
                this.theLoaderViewerRef.current.openDialog(
                    "Loader",
                    <pre>
                        {JSON.stringify(JSON.parse(dataset_instance.loader),null,2)}
                    </pre>
                );
            }}
        >
            <Icon.Info />
        </Button>
    );

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit);
    };

    columns = {
        path:               {display: "Path"},
        publish_time:       {display: "Publish Time"},
        loader:             {display: "Loader", render_data: this.render_loader},
        row_count:          {display: "Row Count"},
        locations:          {display: "Locations", render_data: this.render_locations}
    };

    render() {
        return (
            <Row>
                <Col>
                    <DataTable
                        ref={this.theDataTableRef}
                        hover
                        bordered
                        className="dataset-instance-table"
                        columns = {this.columns}
                        id_column = "id"
                        size = {this.props.size}
                        page_size={this.props.page_size}
                        fast_step_count={10}
                        get_page={this.get_page}
                    />
                    <SimpleDialogBox
                        ref={this.theLoaderViewerRef}
                        backdrop="static"
                        size='lg'
                        scrollable
                    />
                </Col>
            </Row>
        )
    }
}
