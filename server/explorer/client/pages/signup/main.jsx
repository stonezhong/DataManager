import $ from 'jquery';

import React from 'react';
import ReactDOM from 'react-dom';

import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import {
    get_csrf_token, get_app_context, get_current_user, get_app_config, get_tenant_id, handle_json_response
} from '/common_lib';

import './signup.scss';

class SignupPage extends React.Component {
    render() {
        if (this.props.current_user !== null) {
            return (
                <Container className="signup-form-container">
                    <center>
                        You have already logged in.
                    </center>
                </Container>
            );
        }
        return (
            <Container className="signup-form-container">
                <Row>
                    <Col>
                        <center><h4>Signup to Data Manager</h4></center>
                        <br />
                        {
                            this.props.app_context.msg && !this.props.app_context.success &&
                            <Alert variant="danger">
                                { this.props.app_context.msg }
                            </Alert>
                        }
                        {
                            this.props.app_context.msg && this.props.app_context.success &&
                            <Alert variant="success">
                                { this.props.app_context.msg }
                            </Alert>
                        }
                    </Col>
                </Row>
                <Form action="/explorer/signup" method="POST">
                    <input
                        type="hidden"
                        name="csrfmiddlewaretoken"
                        value={this.props.csrf_token}
                    />

                    <Form.Group as={Row} controlId="firstname">
                        <Form.Label column sm={3}>First name</Form.Label>
                        <Col>
                            <Form.Control name="first_name" />
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} controlId="lastname">
                        <Form.Label column sm={3}>Last name</Form.Label>
                        <Col>
                            <Form.Control name="last_name" />
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} controlId="username">
                        <Form.Label column sm={3}>Username</Form.Label>
                        <Col>
                            <Form.Control name="username" />
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} controlId="email">
                        <Form.Label column sm={3}>Email</Form.Label>
                        <Col>
                            <Form.Control name="email" />
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} controlId="password">
                        <Form.Label column sm={3}>Password</Form.Label>
                        <Col>
                            <Form.Control type="password" name="password" />
                        </Col>
                    </Form.Group>

                    <Form.Group as={Row} controlId="password1">
                        <Form.Label column sm={3}>Password (confirm)</Form.Label>
                        <Col>
                            <Form.Control type="password" name="password1" />
                        </Col>
                    </Form.Group>

                    <center>
                        <Button type="submit">Signup</Button>
                    </center>
                </Form>
            </Container>
        );
    }
}

$(function() {
    const current_user = get_current_user();
    const csrf_token = get_csrf_token();
    const app_context = get_app_context();

    ReactDOM.render(
        <SignupPage
            current_user={current_user}
            csrf_token={csrf_token}
            app_context={app_context}
        />,
        document.getElementById('app')
    );
});
