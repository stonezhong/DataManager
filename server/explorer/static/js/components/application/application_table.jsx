import React from 'react'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import * as Icon from 'react-bootstrap-icons'

import {ApplicationEditor} from './application_editor.jsx'

/*********************************************************************************
 * Purpose: Show list of applications
 * TODO: pagination
 *
 * Props
 *     applications : a list of applications
 *     allowEdit    : if True, user is allowed to edit application.
 *     allowNew     : if True, user is allowed to create new application
 *     onSave       : a callback, called with user want to save or edit
 *                    an application. onSave(mode, application) is called,
 *                    mode is either "new" or "edit"
 *
 */
export class ApplicationTable extends React.Component {
    theApplicationEditorRef = React.createRef();

    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <h1 className="c-ib">Applications</h1>
                        {
                            this.props.allowNew && <Button
                                size="sm"
                                className="c-vc ml-2"
                                onClick={() => {
                                    this.theApplicationEditorRef.current.openDialog("new");
                                }}
                            >
                                Create
                            </Button>
                        }
                    </Col>
                </Row>

                <Table hover>
                    <thead className="thead-dark">
                        <tr>
                            <th className="c-tc-icon1"></th>
                            <th>Name</th>
                            <th>Author</th>
                            <th>Team</th>
                            <th>Retired</th>
                        </tr>
                    </thead>
                    <tbody>
                    {
                        this.props.applications.map((application) => {
                            return (
                                <tr key={application.id}>
                                    <td>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={event => {
                                                this.theApplicationEditorRef.current.openDialog(
                                                    this.props.allowEdit?"edit":"view", application
                                                )
                                            }}
                                        >
                                            { this.props.allowEdit?<Icon.Pencil />:<Icon.Info />}
                                        </Button>
                                    </td>
                                    <td>{application.name}</td>
                                    <td>{application.author}</td>
                                    <td>{application.team}</td>
                                    <td>{application.retired?"Yes":"No"}</td>
                                </tr>
                            )
                        })
                    }
                    </tbody>
                </Table>
                <ApplicationEditor
                    ref={this.theApplicationEditorRef}
                    onSave={this.props.onSave}
                />
            </div>
        )
    }
}

