import React from 'react'

import Card from 'react-bootstrap/Card'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import {AssetLinkFromPath} from '/components/business/dataset/utils.jsx'
import {AppIcon} from '/components/generic/icons/main.jsx'
import {ApplicationLink} from '/components/business/application'
import {DataRepoLink} from '/components/business/datarepo'

import './dataset.scss'

/*********************************************************************************
 * Purpose: Show a single asset revision
 *
 * Props
 *     tenant_id            : the tenant id
 *     asset                : the asset to view
 *     dataset              : the dataset asset belongs to
 *     execute_sql_app_id   : application_id for Execute SQL statement
 *
 */
export class DatasetInstanceView extends React.Component {
    app_args = () => JSON.parse(this.props.asset.application_args);

    render_imp = imp => {
        if (imp.asset_name) {
            return <span>import asset <code>{imp.asset_name}</code> as view <code>{imp.alias}</code></span>;
        }
        return <span>import view <code>${imp.alias}</code></span>;
    };

    render_lineage_info() {
        if (!this.props.asset.application) {
            return null;
        }

        if (this.props.asset.application.id === this.props.execute_sql_app_id)
            return this.render_lineage_info_execute_sql();
        else
            return this.render_lineage_info_application();
    }

    render_producer_type() {
        if (!this.props.asset.application) {
            return null;
        }

        if (this.props.asset.application.id === this.props.execute_sql_app_id)
            return "Spark-SQL";
        else
            return "Application";
    }

    render_lineage_info_application() {
        return <div>
            <table className="dataset-lineage-attribute-grid">
                <tbody>
                    <tr>
                        <td>Application</td>
                        <td>
                            <ApplicationLink tenant_id={this.props.tenant_id} application={this.props.asset.application} />
                        </td>
                    </tr>
                    <tr>
                        <td>Arguments</td>
                        <td>
                            <pre>
                                { JSON.stringify(JSON.parse(this.props.asset.application_args),null,2) }
                            </pre>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>;
    }

    render_lineage_info_execute_sql_step(step) {
        return <div key={step.name}>
            <h4>Step: {step.name}</h4>
            <table className="dataset-lineage-sql-step-grid">
                <tbody>
                    {
                        step.imports.map(imp => <tr>
                            <td>
                                Load view "{imp.alias}" from <AssetLinkFromPath path={imp.asset_name} />
                            </td>
                        </tr>)
                    }
                    <tr>
                        <td>
                            Run SQL Statement:<br /><br />
                            <pre>{step.sql}</pre>
                        </td>
                    </tr>

                    {("output" in step) && <tr><td>
                        <div>
                            Save to {step.output.location} as {step.output.type} in {step.output.write_mode} mode.
                        </div>
                        { step.output.register_asset && <div>
                            Publish as <AssetLinkFromPath path={step.output.register_asset} />
                        </div>}
                    </td></tr>}
                </tbody>
            </table>
        </div>;
    }

    render_lineage_info_execute_sql() {
        return <div>
            {
                JSON.parse(this.props.asset.application_args).steps.map(step => this.render_lineage_info_execute_sql_step(step))
            }
        </div>;
    }

    render_asset_status(asset) {
        if (asset.deleted_time)
            return <div>
                <AppIcon type="dismiss" className="icon24 mr-2"/>
                <span className="asset-label-inactive">Deleted at {asset.deleted_time}</span>
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
                <h2>Revision {this.props.asset.revision}</h2>
                <Row>
                    <Col>
                        <Card border={this.props.asset.deleted_time?"danger":"success"}>
                            <Card.Body>
                                <Row>
                                    <Col>
                                        <table className="dataset-attribute-grid">
                                            <tbody>
                                                <tr>
                                                    <td>Status</td>
                                                    <td>{this.render_asset_status(this.props.asset)}</td>
                                                </tr>
                                                <tr>
                                                    <td>Revision</td>
                                                    <td>{this.props.asset.revision}</td>
                                                </tr>
                                                <tr>
                                                    <td>Path</td>
                                                    <td>{this.props.asset.path}</td>
                                                </tr>
                                                <tr>
                                                    <td>Publish Time</td>
                                                    <td>{this.props.asset.publish_time}</td>
                                                </tr>
                                                <tr>
                                                    <td>Data Time</td>
                                                    <td>{this.props.asset.data_time}</td>
                                                </tr>
                                                <tr>
                                                    <td>Row Count</td>
                                                    <td>{this.props.asset.row_count}</td>
                                                </tr>
                                                {(this.props.asset.locations.length > 0) && <tr>
                                                    <td>Locations</td>
                                                    <td>
                                                    {
                                                        this.props.asset.locations.map(location => <div key={location.offset}>
                                                            {
                                                                location.repo && <span className="card-asset-type">
                                                                    <DataRepoLink tenant_id={this.props.tenant_id} datarepo={location.repo} />
                                                                </span>
                                                            }
                                                            <span className="card-asset-type">{location.type}</span>
                                                            <span>{location.location}</span>
                                                        </div>)
                                                    }
                                                    </td>
                                                </tr>}

                                                {Boolean(this.props.asset.loader) && <tr>
                                                    <td>Loader name</td>
                                                    <td>{JSON.parse(this.props.asset.loader).name}</td>
                                                </tr>}
                                                {Boolean(this.props.asset.loader) && <tr>
                                                    <td>Loader args</td>
                                                    <td>{<pre>{JSON.stringify(JSON.parse(this.props.asset.loader).args, null, 2)}</pre>}</td>
                                                </tr>}
                                                <tr>
                                                    <td>Producer type</td>
                                                    <td>{this.render_producer_type()}</td>
                                                </tr>
                                                <tr>
                                                    <td>Upstream</td>
                                                    <td>
                                                        {this.props.asset.src_assets.map(src_asset => <div key={src_asset}>
                                                            <AssetLinkFromPath tenant_id={this.props.tenant_id} path={src_asset} />
                                                        </div>)}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>Downstream</td>
                                                    <td>
                                                        {this.props.asset.dst_assets.map(dst_asset => <div key={dst_asset}>
                                                            <AssetLinkFromPath tenant_id={this.props.tenant_id} path={dst_asset} />
                                                        </div>)}
                                                    </td>
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

