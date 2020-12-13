import React from 'react'

import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import {AppIcon} from '/components/generic/icons/main.jsx'

import "./application.scss"

/*********************************************************************************
 * Purpose: Show an application
 *
 * Props
 *     application  : The application to show
 *
 */
export class ApplicationViewer extends React.Component {
    render() {
        return (
            <Row>
                <Col xs={8}>
                    <Card border="success">
                        <Card.Body>
                            <div
                                dangerouslySetInnerHTML={{__html: this.props.application.description}}
                            ></div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={4}>
                <Card border="success">
                        <Card.Body>
                            <table className="application-viewer-grid">
                                <tbody>
                                    <tr>
                                        <td>Name</td>
                                        <td>{this.props.application.name}</td>
                                    </tr>
                                    <tr>
                                        <td>Author</td>
                                        <td>{this.props.application.author}</td>
                                    </tr>
                                    <tr>
                                        <td>team</td>
                                        <td>{this.props.application.team}</td>
                                    </tr>
                                    <tr>
                                        <td>Active</td>
                                        <td>
                                            <div>
                                                <AppIcon
                                                    type={this.props.application.Retired?"dismiss":"checkmark"}
                                                    className="icon16"
                                                />
                                                <span className="ml-2">
                                                    {this.props.application.Retired?"Retired":""}
                                                </span>

                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Sys App ID</td>
                                        <td>{this.props.application.sys_app_id}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        )
    }
}

