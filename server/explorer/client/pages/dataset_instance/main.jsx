import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import $ from 'jquery'

import {get_current_user, get_app_context} from '/common_lib'
import {DatasetInstanceView} from '/components/business/dataset/dataset_instance_revision.jsx'
import {DatasetLink} from '/components/business/dataset/utils.jsx'

import "./page.scss"

/*********************************************************************************
 * Purpose: Show a single asset revision
 *
 * Props
 *     dataset              : A dataset object
 *     dataset_instance     : A dataset instance object
 *     execute_sql_app_id   : application_id for Execute SQL statement
 *
 */
class DatasetInstancePage extends React.Component {
    render() {
        return (
            <Container fluid>
                <Row>
                    <Col xs={6}>
                        <h1>
                            Asset
                        </h1>
                        <table className="asset-general-info-table">
                            <tbody>
                                <tr>
                                    <td>Dataset</td>
                                    <td><DatasetLink ds={this.props.dataset} /></td>
                                </tr>
                                <tr>
                                    <td>Full Path</td>
                                    <td>
                                        {this.props.dsi_path}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Col>
                </Row>
                <Row className="mt-2">
                    <Col>
                    {
                        this.props.dsi_list.map(dsi => <div id={`revision-${dsi.revision}`}  className="mb-4">
                            <DatasetInstanceView
                                key={dsi.id}
                                dsi={dsi}
                                dataset={this.props.dataset}
                                execute_sql_app_id={this.props.execute_sql_app_id}
                            />
                        </div>)
                    }
                    </Col>
                </Row>
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user();
    const app_context = get_app_context();

    ReactDOM.render(
        <DatasetInstancePage
            current_user={current_user}
            dataset={app_context.ds}
            dsi_list={app_context.dsi_list}
            dsi_path={app_context.dsi_path}
            execute_sql_app_id={app_context.execute_sql_app_id}
        />,
        document.getElementById('app')
    );
});
