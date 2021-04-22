import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Button from 'react-bootstrap/Button'

import {ApplicationTable, ApplicationEditor} from '/components/business/application'

import {TopMessage} from '/components/generic/top_message/main.jsx'
import {PageHeader} from '/components/generic/page_tools'

import $ from 'jquery'
const buildUrl = require('build-url');

import {get_csrf_token, get_current_user, get_tenant_id, handle_json_response} from '/common_lib'
import {saveApplication, getApplications} from '/apis'

class ApplicationsPage extends React.Component {
    theTopMessageRef        = React.createRef();
    theApplicationEditorRef = React.createRef();
    theApplicationTableRef  = React.createRef();

    onSave = (mode, application) => {
        return saveApplication(
            get_csrf_token(),
            this.props.tenant_id,
            mode,
            application
        ).then(this.theApplicationTableRef.current.refresh);
    };

    get_page = (offset, limit, filter={}) => getApplications(
        this.props.tenant_id, offset, limit
    );


    render() {
        return (
            <Container fluid>
                <Row>
                    <Col>
                        <TopMessage ref={this.theTopMessageRef} />
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <PageHeader title="Applications">
                            {
                                !!this.props.current_user && <Button
                                    size="sm"
                                    className="c-vc ml-2"
                                    onClick={() => {
                                        this.theApplicationEditorRef.current.openDialog({mode: "new"});
                                    }}
                                >
                                    Create
                                </Button>
                            }
                        </PageHeader>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <ApplicationTable
                            tenant_id={this.props.tenant_id}
                            ref={this.theApplicationTableRef}
                            get_page={this.get_page}
                            page_size={15}
                            size="sm"
                        />
                    </Col>
                </Row>

                <ApplicationEditor
                    ref={this.theApplicationEditorRef}
                    onSave={this.onSave}
                />

            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user();
    const tenant_id = get_tenant_id();

    ReactDOM.render(
        <ApplicationsPage
            current_user={current_user}
            tenant_id={tenant_id}
        />,
        document.getElementById('app')
    );
});
