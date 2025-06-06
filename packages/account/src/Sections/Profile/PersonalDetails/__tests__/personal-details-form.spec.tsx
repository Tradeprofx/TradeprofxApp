import React from 'react';
import { Router } from 'react-router';
import { createBrowserHistory } from 'history';

import { APIProvider } from '@deriv/api';
import { useGrowthbookGetFeatureValue, useResidenceList } from '@deriv/hooks';
import { mockStore, StoreProvider } from '@deriv/stores';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PersonalDetailsForm from '../personal-details-form';

afterAll(cleanup);
jest.mock('@deriv/components', () => ({
    ...jest.requireActual('@deriv/components'),
    Loading: () => <div>Loading</div>,
}));

jest.mock('@deriv/shared/src/services/ws-methods', () => ({
    WS: {
        send: jest.fn().mockResolvedValue({ time: 1620000000 }),
        wait: (...payload: []) => Promise.resolve([...payload]),
        authorized: {
            storage: {
                getFinancialAssessment: jest.fn(() =>
                    Promise.resolve({
                        get_financial_assessment: {
                            account_turnover: '',
                            cfd_score: 0,
                            education_level: '',
                            employment_industry: '',
                            employment_status: 'Employed',
                            estimated_worth: '',
                            financial_information_score: '',
                            financial_information_version: '',
                            income_source: '',
                            net_income: '',
                            occupation: '',
                            source_of_wealth: '',
                            total_score: '',
                            trading_score: '',
                        },
                    })
                ),
            },
        },
    },
    useWS: () => undefined,
}));

const residence_list = [
    {
        text: 'Text',
        value: 'value',
    },
];

jest.mock('@deriv/hooks', () => ({
    ...jest.requireActual('@deriv/hooks'),
    useStatesList: jest.fn(() => ({ data: residence_list, isLoading: false })),
    useResidenceList: jest.fn(() => ({ data: residence_list, isLoading: false })),
    useGrowthbookGetFeatureValue: jest.fn(),
}));

describe('<PersonalDetailsForm />', () => {
    const history = createBrowserHistory();

    const mock_store = mockStore({
        client: {
            account_settings: {
                first_name: 'John',
                place_of_birth: 'Thailand',
                citizen: 'Thailand',
                email_consent: 1,
                phone_number_verification: {
                    verified: 0,
                },
            },
        },
    });

    const renderComponent = (modified_store = mock_store) => {
        return render(
            <Router history={history}>
                <StoreProvider store={modified_store}>
                    <APIProvider>
                        <PersonalDetailsForm />
                    </APIProvider>
                </StoreProvider>
            </Router>
        );
    };

    beforeEach(() => {
        (useGrowthbookGetFeatureValue as jest.Mock).mockReturnValue([true, true]);
    });

    it('should render successfully', async () => {
        renderComponent();
        expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText(/Ensure your information is correct./i)).toBeInTheDocument();
        });
    });

    it('should render all the personal details fields', () => {
        renderComponent();
        const fields = [
            'First name*',
            'Last name*',
            'Date of birth*',
            'Country of residence*',
            'Phone number*',
            'First line of address*',
            'Second line of address (optional)',
            'Town/City*',
            'State/Province (optional)',
            'Postal/ZIP code',
        ];
        fields.forEach(value => {
            expect(screen.getByText(value)).toBeInTheDocument();
        });
    });

    it('should have "required" validation errors on required form fields', async () => {
        renderComponent();

        await waitFor(async () => {
            const first_name = screen.getByTestId('dt_first_name');
            await userEvent.clear(first_name);
            expect(screen.getByText(/First name is required./)).toBeInTheDocument();
        });
    });

    it('should display error for the regex validation, for First name when unacceptable characters are entered', async () => {
        renderComponent();

        await waitFor(async () => {
            const first_name = screen.getByTestId('dt_first_name');
            await userEvent.type(first_name, 'test 3');
            expect(screen.getByText('Letters, spaces, periods, hyphens, apostrophes only.')).toBeInTheDocument();
        });
    });

    it('should not display error for the regex validation, for First name when acceptable characters are entered', async () => {
        renderComponent();
        await waitFor(async () => {
            const first_name = screen.getByTestId('dt_first_name');
            await userEvent.type(first_name, "test-with' chars.");
            expect(screen.queryByText('Letters, spaces, periods, hyphens, apostrophes only.')).not.toBeInTheDocument();
        });
    });

    it('should render professional client if support_professional_client is true with not verified account', () => {
        mock_store.client.current_landing_company.support_professional_client = 'true';
        renderComponent();
        const professional_client_text = [
            /Professional Client/,
            /By default, all Deriv.com clients are retail clients but anyone can request to be treated as a professional client./,
            /A professional client receives a lower degree of client protection due to the following./,
            /We presume that you possess the experience, knowledge, and expertise to make your own investment decisions and properly assess the risk involved./,
            /We’re not obliged to conduct an appropriateness test, nor provide you with any risk warnings./,
            /You’ll need to authenticate your account before requesting to become a professional client./,
            /Authenticate my account/,
        ];
        professional_client_text.forEach(value => {
            expect(screen.getByText(value)).toBeInTheDocument();
        });
        const auth_text = screen.getByText(/Authenticate my account/);
        const auth_link = auth_text.getAttribute('href');
        expect(auth_link).toBe('/account/proof-of-identity');
    });

    it('should render POI auth link', () => {
        mock_store.client.current_landing_company.support_professional_client = 'true';
        renderComponent();
        const auth_text = screen.getByText(/Authenticate my account/);
        const auth_link = auth_text.getAttribute('href');
        expect(auth_link).toBe('/account/proof-of-identity');
    });

    it('should render POA auth link', () => {
        mock_store.client.current_landing_company.support_professional_client = 'true';
        mock_store.client.authentication_status.identity_status = 'verified';
        renderComponent();
        const auth_text = screen.getByText(/Authenticate my account/);
        const auth_link = auth_text.getAttribute('href');
        expect(auth_link).toBe('/account/proof-of-address');
    });

    it('should render professional client if support_professional_client is true with verified account', () => {
        mock_store.client.current_landing_company.support_professional_client = 'true';
        mock_store.client.authentication_status.document_status = 'verified';
        mock_store.client.authentication_status.identity_status = 'verified';
        renderComponent();
        expect(
            screen.getByRole('checkbox', { name: /I would like to be treated as a professional client./ })
        ).toBeInTheDocument();
    });

    it('should update user profile after clicking on Save changes', async () => {
        renderComponent();
        const first_name = screen.getByTestId('dt_first_name') as HTMLInputElement;
        expect(first_name.value).toBe('John');
        await userEvent.clear(first_name);
        await userEvent.type(first_name, 'James');
        const save_changes_button = screen.getByRole('button', { name: /Save changes/ });
        await userEvent.click(save_changes_button);
        expect(first_name.value).toBe('James');
    });

    it('should only display country of residence if isVirtual is true', () => {
        mock_store.client.is_virtual = true;
        renderComponent();
        const exceptional_fields = [
            'First name*',
            'Last name*',
            'Place of birth',
            'Date of birth*',
            'Citizenship',
            'Phone number*',
            'First line of address*',
            'Second line of address (optional)',
            'Town/City*',
            'State/Province (optional)',
            'Postal/ZIP code',
        ];
        exceptional_fields.forEach(value => {
            expect(screen.queryByText(value)).not.toBeInTheDocument();
        });
        expect(screen.getByText('Country of residence*')).toBeInTheDocument();
    });

    it('should display loader while fetching data', () => {
        (useResidenceList as jest.Mock).mockImplementation(() => ({ data: [], isLoading: true }));
        renderComponent();
        expect(screen.getByText(/Loading/)).toBeInTheDocument();
    });
});
