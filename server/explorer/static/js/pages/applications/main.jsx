import React from 'react'
import ReactDOM from 'react-dom'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Container from 'react-bootstrap/Container'
import * as Icon from 'react-bootstrap-icons'

import {ApplicationEditor} from '/components/application_editor/application_editor.jsx'

import $ from 'jquery'

import {get_csrf_token, get_current_user} from '/common_lib'

class Applications extends React.Component {
    state = {
        applications: [],
    };

    constructor(props) {
        super();
        this.theApplicationEditorRef = React.createRef();
    }

    load_apps() {
        fetch("/api/Applications/")
        .then(res => res.json())
        .then(
            (result) => {
                this.setState({applications: result})
            }
        )
    }

    onApplicationSaved = (mode, application) => {
        if (mode == "new") {
            // for new application, you do not need to pass "retired" -- it is false
            const to_post = {
                name            : application.name,
                description     : application.description,
                team            : application.team,
                app_location    : application.app_location,
            }

            fetch('/api/Applications/', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            })
                .then((res) => res.json())
                .then(
                    (result) => {
                        this.load_apps();
                    }
                )
        } else {
            // You cannot change name
            const to_patch = {
                description     : application.description,
                team            : application.team,
                location        : application.location,
                retired         : application.retired,
            }
            fetch(`/api/Applications/${application.id}/`, {
                method: 'patch',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_patch)
            })
                .then((res) => res.json())
                .then(
                    (result) => {
                        this.load_apps();
                    }
                )
        }

    };

    componentDidMount() {
        this.load_apps();
    }

    render() {
        return (
            <div>
                <Container fluid>
                    <Row>
                        <Col>
                            <h1 className="c-ib">Applications</h1>
                            <Button
                                disabled = {!this.props.current_user}
                                size="sm"
                                className="c-vc ml-2"
                                onClick={() => {
                                    this.theApplicationEditorRef.current.openDialog();
                                }}
                            >
                                Create
                            </Button>
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
                            this.state.applications.map((application) => {
                                return (
                                    <tr key={application.id}>
                                        <td  className="align-middle">
                                            <Button
                                                disabled = {!this.props.current_user}
                                                variant="secondary"
                                                size="sm"
                                                onClick={event => {
                                                    this.theApplicationEditorRef.current.openDialog(application);
                                                }}
                                            >
                                                <Icon.Pencil />
                                            </Button>
                                        </td>
                                        <td className="align-middle">{application.name}</td>
                                        <td className="align-middle">{application.author}</td>
                                        <td className="align-middle">{application.team}</td>
                                        <td className="align-middle">{application.retired?"Yes":"No"}</td>
                                    </tr>
                                )
                            })
                        }
                        </tbody>
                    </Table>
                </Container>

                <ApplicationEditor
                    ref={this.theApplicationEditorRef}
                    onSave={this.onApplicationSaved}
                />
            </div>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <Applications current_user={current_user} />,
        document.getElementById('app')
    );
});
