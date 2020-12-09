import React from 'react'

import Card from 'react-bootstrap/Card'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import {DatasetLink, AssetLinkFromDSIPath} from '/components/business/dataset/utils.jsx'

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

    render() {
        return (
            <Card border={this.props.dsi.deleted_time?"warning":"success"}>
                <Card.Body>
                    { this.props.dsi.deleted_time && <Card.Title>
                            Revision: {this.props.dsi.revision} <b>Deleted at {this.props.dsi.deleted_time}</b>
                        </Card.Title>
                    }
                    { !this.props.dsi.deleted_time && <Card.Title>
                            Revision: {this.props.dsi.revision}
                        </Card.Title>
                    }

                    <Row>
                        <Col xs={3}>Dataset</Col>
                        <Col>
                            <DatasetLink ds={this.props.dataset} />
                        </Col>
                    </Row>

                    <Row>
                        <Col xs={3}>Path</Col>
                        <Col>{this.props.dsi.path}</Col>
                    </Row>
                    <Row>
                        <Col xs={3}>Publish Time</Col>
                        <Col>{this.props.dsi.publish_time}</Col>
                    </Row>
                    <Row>
                        <Col xs={3}>Data Time</Col>
                        <Col>{this.props.dsi.data_time}</Col>
                    </Row>
                    <Row>
                        <Col xs={3}>Row Count</Col>
                        <Col>{this.props.dsi.row_count}</Col>
                    </Row>
                    <Row>
                        <Col xs={3}>Locations</Col>
                        <Col>
                            {
                                this.props.dsi.locations.map(location => <div key={location.position}>
                                    <span className="card-asset-type">{location.type}</span>
                                    <span>{location.location}</span>
                                </div>)
                            }
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={3}>From</Col>
                        <Col>
                            {this.props.dsi.src_dataset_instances.map(src_dsi => <div key={src_dsi}>
                                <AssetLinkFromDSIPath dsi_path={src_dsi} />
                            </div>)}
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={3}>To</Col>
                        <Col>
                            {this.props.dsi.dst_dataset_instances.map(dst_dsi => <div key={dst_dsi}>
                                <AssetLinkFromDSIPath dsi_path={dst_dsi} />
                            </div>)}
                        </Col>
                    </Row>
                    {
                        this.props.dsi.application && this.props.dsi.application.id === this.props.execute_sql_app_id && <Row>
                            <Col xs={3}>Application</Col>
                            <Col>Spark-SQL</Col>
                        </Row>
                    }
                    {
                        this.props.dsi.application && this.props.dsi.application.id === this.props.execute_sql_app_id && this.app_args().steps.map(step => <div key={step.name}>
                            <Row className="mt-4">
                                <Col>
                                    <h2>step: {step.name}</h2>
                                    <div className="card-indent-level-1">
                                        <h3>Import Views</h3>
                                            { step.imports.map(imp => <span class="card-indent-level-1" key={imp.alias}>{ this.render_imp(imp) }</span>) }
                                        <h3>SQL Query</h3>
                                        <pre className="card-indent-level-1">
                                            <code>
                                                {step.sql}
                                            </code>
                                        </pre>
                                        {step.alias && <h3>Export View: {step.alias}</h3>}
                                        {step.output && <div>
                                            <span className="card-prompt">Save Output</span><span>Yes</span><br />
                                            <span className="card-prompt">Save To</span><span>{step.output.location}</span><br />
                                            <span className="card-prompt">Save As</span><span>{step.output.type}</span><br />
                                            <span className="card-prompt">Save Mode</span><span>{step.output.write_mode}</span><br />
                                            {step.output.register_dataset_instance && <div>
                                                <span className="card-prompt">Register Asset</span><span>{step.output.register_dataset_instance}</span><br />
                                                <span className="card-prompt">Data Time</span><span>{step.output.data_time}</span><br />
                                            </div>}
                                        </div>}
                                        {!step.output && <div>Save output: No</div>}
                                    </div>
                                </Col>
                            </Row>
                        </div>)
                    }
                    {
                        this.props.dsi.application && this.props.dsi.application.id !== this.props.execute_sql_app_id && <Row>
                            <Col xs={3}>Application</Col>
                            <Col>{this.props.dsi.application.name}</Col>
                        </Row>
                    }
                    {
                        this.props.dsi.application && this.props.dsi.application.id !== this.props.execute_sql_app_id && <Row>
                            <Col xs={3}>Application Args</Col>
                            <Col>
                                <code>
                                    <pre>
                                        { JSON.stringify(JSON.parse(this.props.dsi.application_args),null,2) }
                                    </pre>
                                </code>
                            </Col>
                        </Row>
                    }
                </Card.Body>
            </Card>
        )
    }
}

