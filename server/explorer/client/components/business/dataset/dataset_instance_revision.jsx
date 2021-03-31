import React from 'react'

import Card from 'react-bootstrap/Card'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import {AssetLinkFromDSIPath} from '/components/business/dataset/utils.jsx'
import {AppIcon} from '/components/generic/icons/main.jsx'
import {ApplicationLink} from '/components/business/application'
import {DataRepoLink} from '/components/business/datarepo'

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

    render_producer_type() {
        if (!this.props.dsi.application) {
            return null;
        }

        if (this.props.dsi.application.id === this.props.execute_sql_app_id)
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
                            <ApplicationLink tenant_id={this.props.tenant_id} application={this.props.dsi.application} />
                        </td>
                    </tr>
                    <tr>
                        <td>Arguments</td>
                        <td>
                            <pre>
                                { JSON.stringify(JSON.parse(this.props.dsi.application_args),null,2) }
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
                                Load view "{imp.alias}" from <AssetLinkFromDSIPath dsi_path={imp.dsi_name} />
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
                        { step.output.register_dataset_instance && <div>
                            Publish as <AssetLinkFromDSIPath dsi_path={step.output.register_dataset_instance} />
                        </div>}
                    </td></tr>}
                </tbody>
            </table>
        </div>;
    }

    render_lineage_info_execute_sql() {
        return <div>
            {
                JSON.parse(this.props.dsi.application_args).steps.map(step => this.render_lineage_info_execute_sql_step(step))
            }
        </div>;
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
                                                {(this.props.dsi.locations.length > 0) && <tr>
                                                    <td>Locations</td>
                                                    <td>
                                                    {
                                                        this.props.dsi.locations.map(location => <div key={location.position}>
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

                                                {this.props.dsi.loader && <tr>
                                                    <td>Loader name</td>
                                                    <td>{JSON.parse(this.props.dsi.loader).name}</td>
                                                </tr>}
                                                {this.props.dsi.loader && <tr>
                                                    <td>Loader args</td>
                                                    <td>{<pre>{JSON.stringify(JSON.parse(this.props.dsi.loader).args, null, 2)}</pre>}</td>
                                                </tr>}
                                                <tr>
                                                    <td>Producer type</td>
                                                    <td>{this.render_producer_type()}</td>
                                                </tr>
                                                <tr>
                                                    <td>Upstream</td>
                                                    <td>
                                                        {this.props.dsi.src_dataset_instances.map(src_dsi => <div key={src_dsi}>
                                                            <AssetLinkFromDSIPath tenant_id={this.props.tenant_id} dsi_path={src_dsi} />
                                                        </div>)}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>Downstream</td>
                                                    <td>
                                                        {this.props.dsi.dst_dataset_instances.map(dst_dsi => <div key={dst_dsi}>
                                                            <AssetLinkFromDSIPath tenant_id={this.props.tenant_id} dsi_path={dst_dsi} />
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

