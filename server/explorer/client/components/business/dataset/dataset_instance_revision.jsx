import React from 'react'

import Card from 'react-bootstrap/Card'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import {DatasetLink, AssetLinkFromDSIPath} from '/components/business/dataset/utils.jsx'
import {AppIcon} from '/components/generic/icons/main.jsx'

import './dataset.scss'

/*********************************************************************************
 * Purpose: Show a single asset revision
 *
 * Props
 *     dataset              : A dataset object
 *     dataset_instance     : A dataset instance object
 *     execute_sql_app_id   : application_id for Execute SQL statement
 *
 */
export class DatasetInstanceView extends React.Component {
    app_args = () => JSON.parse(this.props.dsi.application_args);

    render_imp = imp => {
        if (imp.dsi_name) {
            return <span>import asset <code>{imp.dsi_name}</code> as view <code>{imp.alias}</code></span>;
        }
        return <span>import view <code>${imp.alias}</code></span>;
    };

    render_lineage_info() {
        if (!this.props.dsi.application) {
            return null;
        }

        if (this.props.dsi.application.id === this.props.execute_sql_app_id)
            return this.render_lineage_info_execute_sql();
        else
            return this.render_lineage_info_application();
    }

    render_lineage_info_application() {
        return <div>
            <table className="dataset-lineage-attribute-grid">
                <tbody>
                    <tr>
                        <td>Application</td>
                        <td>{this.props.dsi.application.name}</td>
                    </tr>
                    <tr>
                        <td>Arguments</td>
                        <td>
                            <pre>
                                { JSON.stringify(JSON.parse(this.props.dsi.application_args),null,2) }
                            </pre>
                        </td>
                    </tr>
                    <tr>
                        <td>Upstream Assets</td>
                        <td>
                            {this.props.dsi.src_dataset_instances.map(src_dsi => <div key={src_dsi}>
                                <AssetLinkFromDSIPath dsi_path={src_dsi} />
                            </div>)}
                        </td>
                    </tr>
                    <tr>
                        <td>Downstream Assets</td>
                        <td>
                            {this.props.dsi.dst_dataset_instances.map(dst_dsi => <div key={dst_dsi}>
                                <AssetLinkFromDSIPath dsi_path={dst_dsi} />
                            </div>)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>;
    }

    render_lineage_info_execute_sql() {
        return null;
    }

    render_loader_name() {
        if (!this.props.dsi.loader) {
            return null;
        }
        return JSON.parse(this.props.dsi.loader).name;
    }

    render_loader_args() {
        if (!this.props.dsi.loader) {
            return null;
        }
        return <pre>{JSON.stringify(JSON.parse(this.props.dsi.loader).args, null, 2)}</pre>;
    }

    render_dsi_status(dsi) {
        if (dsi.deleted_time)
            return <div>
                <AppIcon type="dismiss" className="icon24 mr-2"/>
                <span className="asset-label-inactive">Deleted at {dsi.deleted_time}</span>
            </div>;
        else
            return <div>
                <AppIcon type="checkmark" className="icon24 mr-2"/>
                <span className="asset-label-active">Active</span>
            </div>;
    }

    render() {
        return (
            <div>
                <h2>Revision {this.props.dsi.revision}</h2>
                <Row>
                    <Col>
                        <Card border={this.props.dsi.deleted_time?"danger":"success"}>
                            <Card.Body>
                                <Row>
                                    <Col>
                                        <table className="dataset-attribute-grid">
                                            <tbody>
                                                <tr>
                                                    <td>Status</td>
                                                    <td>{this.render_dsi_status(this.props.dsi)}</td>
                                                </tr>
                                                <tr>
                                                    <td>Revision</td>
                                                    <td>{this.props.dsi.revision}</td>
                                                </tr>
                                                <tr>
                                                    <td>Path</td>
                                                    <td>{this.props.dsi.path}</td>
                                                </tr>
                                                <tr>
                                                    <td>Publish Time</td>
                                                    <td>{this.props.dsi.publish_time}</td>
                                                </tr>
                                                <tr>
                                                    <td>Data Time</td>
                                                    <td>{this.props.dsi.data_time}</td>
                                                </tr>
                                                <tr>
                                                    <td>Row Count</td>
                                                    <td>{this.props.dsi.row_count}</td>
                                                </tr>
                                                <tr>
                                                    <td>Locations</td>
                                                    <td>
                                                    {
                                                        this.props.dsi.locations.map(location => <div key={location.position}>
                                                            <span className="card-asset-type">{location.type}</span>
                                                            <span>{location.location}</span>
                                                        </div>)
                                                    }
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>Loader name</td>
                                                    <td>{this.render_loader_name()}</td>
                                                </tr>
                                                <tr>
                                                    <td>Loader args</td>
                                                    <td>{this.render_loader_args()}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </Col>
                                    <Col>
                                        { this.render_lineage_info() }
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </div>
        )
    }
}

