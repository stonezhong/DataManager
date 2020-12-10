import React from 'react'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Card from 'react-bootstrap/Card'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit a Dataset
 *
 * Props
 *     show     : boolean, show or hide this commponent
 *     dataset  : the dataset object
 *
 */

export class DatasetViewer extends React.Component {
    render() {
        if (!this.props.show) {
            return null;
        }

        return (
            <div>
                <Row>
                    <Col xs={8}>
                        <Card border="success">
                            <Card.Body>
                                <div
                                    dangerouslySetInnerHTML={{__html: this.props.dataset.description}}
                                ></div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={4}>
                        <Card border="success">
                            <Card.Body>
                                <table className="dataset-attribute-grid">
                                    <tbody>
                                        <tr>
                                            <td>Name</td>
                                            <td>{this.props.dataset.name}</td>
                                        </tr>
                                        <tr>
                                            <td>Major Version</td>
                                            <td>{this.props.dataset.major_version}</td>
                                        </tr>
                                        <tr>
                                            <td>Minor Version</td>
                                            <td>{this.props.dataset.minor_version}</td>
                                        </tr>
                                        <tr>
                                            <td>Author</td>
                                            <td>{this.props.dataset.author}</td>
                                        </tr>
                                        <tr>
                                            <td>Team</td>
                                            <td>{this.props.dataset.team}</td>
                                        </tr>
                                        <tr>
                                            <td>Publish Time</td>
                                            <td>{this.props.dataset.publish_time}</td>
                                        </tr>
                                        <tr>
                                            <td>Expiration Time</td>
                                            <td>{this.props.dataset.expiration_time}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    }
}
