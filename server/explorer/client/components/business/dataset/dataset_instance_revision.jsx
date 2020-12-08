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
 *
 */
export class DatasetInstanceView extends React.Component {
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
                                this.props.dsi.locations.map(location => <Row key={location.position}>
                                    <Col xs={2}>{location.type}</Col>
                                    <Col>{location.location}</Col>
                                </Row>)
                            }
                        </Col>
                    </Row>
                    {
                        this.props.dsi.application && <Row>
                            <Col xs={3}>Application</Col>
                            <Col><a href="#">{this.props.dsi.application.name}</a></Col>
                        </Row>
                    }
                    {
                        this.props.dsi.application && <Row>
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
                    <Row>
                        <Col xs={3}>From</Col>
                        <Col>
                            {this.props.dsi.src_dataset_instances.map(src_dsi => <Row key={src_dsi}>
                                <AssetLinkFromDSIPath dsi_path={src_dsi} />
                            </Row>)}
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={3}>To</Col>
                        <Col>
                            {this.props.dsi.dst_dataset_instances.map(dst_dsi => <Row key={dst_dsi}>
                                <AssetLinkFromDSIPath dsi_path={dst_dsi} />
                            </Row>)}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        )
    }
}

