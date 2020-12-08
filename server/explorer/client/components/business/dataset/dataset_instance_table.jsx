import React from 'react'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'

import * as Icon from 'react-bootstrap-icons'
import {DataTable} from '/components/generic/datatable/main.jsx'
import {SimpleDialogBox} from '/components/generic/dialogbox/simple.jsx'
import {AssetLink, AssetLinkFromDSIPath} from '/components/business/dataset/utils.jsx'

import './dataset.scss'

/*********************************************************************************
 * Purpose: Show list of dataset instances
 * TODO: pagination
 *
 * Props
 *     ds                    : object, dataset
 *     allowDelete           : boolean, allow delete dataset instance?
 *     onDelete              : function, onDelete(dataset_instance_id), delete a
 *                             dataset instance
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

    render_data_time = dataset_instance => {
        // short display if data_time is at day boundary
        const suffix = " 00:00:00";
        if (dataset_instance.data_time.endsWith(suffix)) {
            return dataset_instance.data_time.substring(0, dataset_instance.data_time.length - suffix.length);
        } else {
            return dataset_instance.data_time;
        }
    };

    render_dependency = dataset_instance => (
        <Button
            variant="secondary"
            size="sm"
            variant="secondary"
            onClick={event => {
                this.theLoaderViewerRef.current.openDialog(
                    "Asset Dependency",
                    <div>
                        {(dataset_instance.src_dataset_instances.length == 0) && <p>
                            From assets: none
                        </p>}
                        {(dataset_instance.src_dataset_instances.length > 0) && <div>
                            From assets:
                            <ul>
                                {
                                    dataset_instance.src_dataset_instances.map(
                                        dsi_path => <li><AssetLinkFromDSIPath dsi_path={dsi_path}/></li>
                                    )
                                }
                            </ul>
                        </div>}

                        {(dataset_instance.dst_dataset_instances.length == 0) && <p>
                            To assets: none
                        </p>}
                        {(dataset_instance.dst_dataset_instances.length > 0) && <div>
                            To assets:
                            <ul>
                                {
                                    dataset_instance.dst_dataset_instances.map(
                                        dsi_path => <li><AssetLinkFromDSIPath dsi_path={dsi_path}/></li>
                                    )
                                }
                            </ul>
                        </div>}
                    </div>
                );
            }}
        >
            <Icon.Info />
        </Button>
    );

    onDelete = dataset_instance_id => {
        return this.props.onDelete(dataset_instance_id).then(this.theDataTableRef.current.refresh);
    };


    render_tools = dataset_instance => {
        if (!this.props.allowDelete) {
            return null;
        }

        if (dataset_instance.dst_dataset_instances.length > 0) {
            return null;
        }

        return (<Button
            variant="secondary"
            size="sm"
            onClick={
                event => { this.onDelete(dataset_instance.id); }
            }
        >
            <Icon.Trash />
        </Button>);
    };

    render_path = dataset_instance => <AssetLink ds={this.props.ds} dsi={dataset_instance} />;

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit);
    };

    columns = {
        tools:              {display:"", render_data: this.render_tools},
        path:               {display: "Path", render_data: this.render_path},
        data_time:          {display: "Data Time", render_data: this.render_data_time},
        publish_time:       {display: "Publish Time"},
        revision:           {display: "Revision"},
        dependency:         {display: "Dependency", render_data: this.render_dependency},
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
