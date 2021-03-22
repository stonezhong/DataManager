import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Button from 'react-bootstrap/Button'

import {
    ApplicationViewer,
    ApplicationEditor
} from '/components/business/application'
import {PageHeader} from '/components/generic/page_tools'
import {saveApplication} from '/apis'

import $ from 'jquery'

import {get_csrf_token, get_current_user, get_app_context} from '/common_lib'

/*********************************************************************************
 * Purpose: Page to view an application
 *
 * Props
 *      application : the application to view
 *      current_user: the user who is viewing
 */

class ApplicationPage extends React.Component {
    theApplicationEditorRef = React.createRef();

    saveApplicationAndRefresh = (mode, application) => {
        return saveApplication(get_csrf_token(), mode, application).then(() => {
            location.reload();
        });
    };

    render() {
        return (
            <Container fluid>
                <Row>
                    <Col>
                        <PageHeader title="Application">
                            {!!this.props.current_user &&
                                <Button
                                    className="ml-2"
                                    variant="secondary"
                                    size="sm"
                                    onClick={event => {
                                        this.theApplicationEditorRef.current.openDialog({
                                            mode: "edit" ,
                                            application: this.props.application
                                        })
                                    }}
                                >
                                    Edit
                                </Button>
                            }
                        </PageHeader>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <ApplicationViewer application = {this.props.application} />
                    </Col>
                </Row>
                <ApplicationEditor
                    ref={this.theApplicationEditorRef}
                    onSave={this.saveApplicationAndRefresh}
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    const app_context = get_app_context();

    ReactDOM.render(
        <ApplicationPage
            current_user={current_user}
            application={app_context.application}
        />,
        document.getElementById('app')
    );
});
