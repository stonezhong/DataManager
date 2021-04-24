import React from 'react'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Button from 'react-bootstrap/Button'
import ReactJson from 'react-json-view'

import * as Icon from 'react-bootstrap-icons'
import {DataTable} from '/components/generic/datatable/main.jsx'
import {SimpleDialogBox} from '/components/generic/dialogbox/simple.jsx'
import {AssetLink, AssetLinkFromPath} from '/components/business/dataset/utils.jsx'
import {DataRepoLink} from '/components/business/datarepo'

import './dataset.scss'

/*********************************************************************************
 * Purpose: Show list of assets
 * TODO: pagination
 *
 * Props
 *     tenant_id             : the tenant id
 *     dataset               : object, dataset
 *     allowDelete           : boolean, allow delete dataset instance?
 *     onDelete              : function, onDelete(asset_id), delete a
 *                             dataset instance
 *     get_page              : API to get current page
 *     page_size             : page size
 *
 */
export class DatasetInstanceTable extends React.Component {
    theLoaderViewerRef  = React.createRef();
    theDataTableRef     = React.createRef();

    render_locations = asset => (
        <Table size="sm" borderless className="c-location-table">
            <tbody>
                {asset.locations.map((location)=>{
                    return (
                        <tr key={location.offset}>
                            <td><small><code>
                                {
                                    location.repo && <DataRepoLink
                                        datarepo={location.repo}
                                        tenant_id={this.props.tenant_id}

                                    />
                                }
                            </code></small></td>
                            <td><small><code>{location.type}</code></small></td>
                            <td><small><code>{location.location}</code></small></td>
                            <td><small><code>{location.size}</code></small></td>
                        </tr>
                    )
                })}
            </tbody>
        </Table>
    );

    render_loader = asset => (
        asset.loader && <Button
            variant="secondary"
            size="sm"
            variant="secondary"
            onClick={event => {
                this.theLoaderViewerRef.current.openDialog(
                    "Loader",
                    <div>
                        <ReactJson  src={JSON.parse(asset.loader)}
                            theme="colors"
                            iconStyle="circle"
                            quotesOnKeys={false}
                            displayArrayKey={false}
                            name={null}
                            collapsed={false}
                            displayDataTypes={false}
                            displayObjectSize={false}
                            enableClipboard={false}
                        />
                    </div>
                );
            }}
        >
            <Icon.Info />
        </Button>
    );

    render_data_time = asset => {
        // short display if data_time is at day boundary
        const suffix = " 00:00:00";
        if (asset.data_time.endsWith(suffix)) {
            return asset.data_time.substring(0, asset.data_time.length - suffix.length);
        } else {
            return asset.data_time;
        }
    };

    render_dependency = asset => (
        <Button
            variant="secondary"
            size="sm"
            variant="secondary"
            onClick={event => {
                this.theLoaderViewerRef.current.openDialog(
                    "Asset Dependency",
                    <div>
                        {(asset.src_assets.length == 0) && <p>
                            From assets: none
                        </p>}
                        {(asset.src_assets.length > 0) && <div>
                            From assets:
                            <ul>
                                {
                                    asset.src_assets.map(
                                        path => <li><AssetLinkFromPath path={path}/></li>
                                    )
                                }
                            </ul>
                        </div>}

                        {(asset.dst_assets.length == 0) && <p>
                            To assets: none
                        </p>}
                        {(asset.dst_assets.length > 0) && <div>
                            To assets:
                            <ul>
                                {
                                    asset.dst_assets.map(
                                        path => <li><AssetLinkFromPath path={path}/></li>
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

    onDelete = asset_id => {
        return this.props.onDelete(asset_id).then(this.theDataTableRef.current.refresh);
    };


    render_tools = asset => {
        if (!this.props.allowDelete) {
            return null;
        }

        if (asset.dst_assets.length > 0) {
            return null;
        }

        return (<Button
            variant="secondary"
            size="sm"
            onClick={
                event => { this.onDelete(asset.id); }
            }
        >
            <Icon.Trash />
        </Button>);
    };

    render_name = asset => <AssetLink
        tenant_id={this.props.tenant_id}
        ds={this.props.ds}
        asset={asset}
    />;

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit);
    };

    columns = {
        tools:              {display:"", render_data: this.render_tools},
        name:               {display: "name", render_data: this.render_name},
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
                        dialogClassName="md-modal"
                    />
                </Col>
            </Row>
        )
    }
}
